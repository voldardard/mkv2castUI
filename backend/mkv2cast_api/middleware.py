"""
Django middleware for detailed error logging.
"""
import logging
import json
import traceback
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger('mkv2cast_api')


class ErrorLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log detailed information about requests that result in errors.
    
    Logs requests with status code >= 400, including:
    - URL and HTTP method
    - Status code
    - User (if authenticated)
    - IP address
    - Relevant headers
    - Request body (for errors, with sensitive data masked)
    - Stack trace (if exception occurred)
    """
    
    # Headers to include in logs (excluding sensitive ones)
    SAFE_HEADERS = [
        'CONTENT_TYPE',
        'HTTP_USER_AGENT',
        'HTTP_REFERER',
        'HTTP_ACCEPT',
        'HTTP_ACCEPT_LANGUAGE',
        'HTTP_ACCEPT_ENCODING',
    ]
    
    # Fields to mask in request body
    SENSITIVE_FIELDS = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'csrfmiddlewaretoken',
    ]
    
    # Paths to ignore or downgrade logging for (misconfigured proxy routes)
    # These are typically NextAuth routes that shouldn't be proxied to Django
    IGNORED_404_PATHS = [
        '/api/auth/session',
        '/api/auth/_log',
        '/api/auth/csrf',
        '/api/auth/providers',
        '/api/auth/callback',
        '/api/auth/signin',
        '/api/auth/signout',
    ]
    
    def _should_ignore_error(self, request, response):
        """Check if this error should be ignored or downgraded."""
        path = request.path
        
        # Ignore 404s on NextAuth routes (proxy misconfiguration)
        if response.status_code == 404:
            for ignored_path in self.IGNORED_404_PATHS:
                if path.startswith(ignored_path):
                    return True
        
        return False
    
    def process_response(self, request, response):
        """Log error responses (status >= 400)."""
        if response.status_code >= 400:
            if self._should_ignore_error(request, response):
                # Log at INFO level instead of ERROR for known proxy misconfigurations
                logger.info(
                    f"Proxy misconfiguration (ignored): {request.method} {request.path} - {response.status_code} "
                    f"(hint: this route should be handled by Next.js, not Django)"
                )
            else:
                self._log_error(request, response)
        return response
    
    def process_exception(self, request, exception):
        """Log unhandled exceptions."""
        self._log_exception(request, exception)
        return None  # Let Django handle the exception normally
    
    def _log_error(self, request, response):
        """Log detailed error information."""
        try:
            log_data = {
                'status_code': response.status_code,
                'method': request.method,
                'path': request.get_full_path(),
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                'ip': self._get_client_ip(request),
                'headers': self._get_safe_headers(request),
            }
            
            # Add request body for POST/PUT/PATCH requests (with sensitive data masked)
            if request.method in ('POST', 'PUT', 'PATCH'):
                body_data = self._get_request_body(request)
                if body_data:
                    log_data['body'] = self._mask_sensitive_data(body_data)
            
            # Add query parameters
            if request.GET:
                log_data['query_params'] = dict(request.GET)
            
            # Add response content if it's JSON (for API errors)
            if hasattr(response, 'data') and isinstance(response.data, dict):
                log_data['response_data'] = response.data
            elif hasattr(response, 'content'):
                try:
                    # Try to parse JSON response
                    content_str = response.content.decode('utf-8')
                    if content_str.startswith('{') or content_str.startswith('['):
                        log_data['response_data'] = json.loads(content_str)
                except (UnicodeDecodeError, json.JSONDecodeError):
                    # Not JSON, skip
                    pass
            
            logger.error(
                f"Request Error: {request.method} {request.get_full_path()} - {response.status_code}",
                extra={'log_data': log_data}
            )
            
            # Also log as structured JSON for easier parsing
            logger.error(f"ERROR_DETAILS: {json.dumps(log_data, default=str)}")
            
        except Exception as e:
            # Don't let logging errors break the request
            logger.warning(f"Failed to log error details: {e}")
    
    def _log_exception(self, request, exception):
        """Log unhandled exception with stack trace."""
        try:
            log_data = {
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'method': request.method,
                'path': request.get_full_path(),
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                'ip': self._get_client_ip(request),
                'headers': self._get_safe_headers(request),
                'stack_trace': traceback.format_exc(),
            }
            
            # Add request body if available
            if request.method in ('POST', 'PUT', 'PATCH'):
                body_data = self._get_request_body(request)
                if body_data:
                    log_data['body'] = self._mask_sensitive_data(body_data)
            
            logger.exception(
                f"Unhandled Exception: {request.method} {request.get_full_path()} - {type(exception).__name__}: {str(exception)}",
                extra={'log_data': log_data}
            )
            
            # Also log as structured JSON
            logger.error(f"EXCEPTION_DETAILS: {json.dumps(log_data, default=str)}")
            
        except Exception as e:
            logger.warning(f"Failed to log exception details: {e}")
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip
    
    def _get_safe_headers(self, request):
        """Get safe headers (excluding sensitive ones)."""
        headers = {}
        for header_name in self.SAFE_HEADERS:
            value = request.META.get(header_name)
            if value:
                # Remove HTTP_ prefix and convert to standard header name
                header_key = header_name.replace('HTTP_', '').replace('_', '-').title()
                headers[header_key] = value
        return headers
    
    def _get_request_body(self, request):
        """Get request body data."""
        try:
            if hasattr(request, 'body') and request.body:
                # Try to parse JSON
                try:
                    return json.loads(request.body.decode('utf-8'))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    # Not JSON, return as string (truncated)
                    body_str = request.body.decode('utf-8', errors='replace')
                    return body_str[:1000]  # Limit to 1000 chars
            elif hasattr(request, 'POST') and request.POST:
                return dict(request.POST)
            elif hasattr(request, 'FILES') and request.FILES:
                # For file uploads, just log filenames
                return {
                    'files': [f.name for f in request.FILES.values()]
                }
        except Exception:
            pass
        return None
    
    def _mask_sensitive_data(self, data):
        """Mask sensitive fields in data."""
        if isinstance(data, dict):
            masked = {}
            for key, value in data.items():
                key_lower = key.lower()
                # Check if this field should be masked
                if any(sensitive in key_lower for sensitive in self.SENSITIVE_FIELDS):
                    masked[key] = '***MASKED***'
                elif isinstance(value, (dict, list)):
                    masked[key] = self._mask_sensitive_data(value)
                else:
                    masked[key] = value
            return masked
        elif isinstance(data, list):
            return [self._mask_sensitive_data(item) if isinstance(item, (dict, list)) else item for item in data]
        else:
            return data
