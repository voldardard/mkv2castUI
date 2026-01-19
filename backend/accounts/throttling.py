"""
Brute-force protection and rate limiting for authentication.
"""
import hashlib
import time
from django.core.cache import cache
from django.conf import settings
from rest_framework.throttling import BaseThrottle
from rest_framework.exceptions import Throttled


class LoginRateThrottle(BaseThrottle):
    """
    Rate limiting for login attempts.
    
    Implements progressive delays and account lockout:
    - Max 5 failed attempts per 15 minutes per IP
    - Max 10 failed attempts per 30 minutes per username
    - Progressive delay after each failed attempt
    """
    
    # Cache key prefixes
    IP_PREFIX = 'login_ip_'
    USER_PREFIX = 'login_user_'
    
    # Limits
    IP_MAX_ATTEMPTS = 5
    IP_TIMEOUT = 15 * 60  # 15 minutes
    
    USER_MAX_ATTEMPTS = 10
    USER_TIMEOUT = 30 * 60  # 30 minutes
    
    # Progressive delay (seconds) based on attempt number
    PROGRESSIVE_DELAYS = [0, 0, 1, 2, 4, 8, 16, 32, 60, 120]
    
    def __init__(self):
        self.ip_key = None
        self.user_key = None
        self.ip_attempts = 0
        self.user_attempts = 0
    
    def get_cache_key(self, prefix, identifier):
        """Generate a cache key for rate limiting."""
        # Hash the identifier to avoid issues with special characters
        hashed = hashlib.md5(identifier.encode()).hexdigest()
        return f'{prefix}{hashed}'
    
    def get_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
        return ip
    
    def allow_request(self, request, view):
        """Check if the request should be allowed."""
        if request.method != 'POST':
            return True
        
        ip = self.get_ip(request)
        self.ip_key = self.get_cache_key(self.IP_PREFIX, ip)
        
        # Get current IP attempts
        ip_data = cache.get(self.ip_key, {'attempts': 0, 'first_attempt': time.time()})
        self.ip_attempts = ip_data.get('attempts', 0)
        
        # Check IP rate limit
        if self.ip_attempts >= self.IP_MAX_ATTEMPTS:
            elapsed = time.time() - ip_data.get('first_attempt', 0)
            if elapsed < self.IP_TIMEOUT:
                wait_time = int(self.IP_TIMEOUT - elapsed)
                raise Throttled(
                    wait=wait_time,
                    detail=f'Too many login attempts from this IP. Please wait {wait_time} seconds.'
                )
            else:
                # Reset counter
                self.ip_attempts = 0
        
        return True
    
    def check_user_throttle(self, email):
        """Check rate limit for specific user (called after getting email from request)."""
        self.user_key = self.get_cache_key(self.USER_PREFIX, email.lower())
        
        # Get current user attempts
        user_data = cache.get(self.user_key, {'attempts': 0, 'first_attempt': time.time()})
        self.user_attempts = user_data.get('attempts', 0)
        
        # Check user rate limit
        if self.user_attempts >= self.USER_MAX_ATTEMPTS:
            elapsed = time.time() - user_data.get('first_attempt', 0)
            if elapsed < self.USER_TIMEOUT:
                wait_time = int(self.USER_TIMEOUT - elapsed)
                raise Throttled(
                    wait=wait_time,
                    detail=f'Too many login attempts for this account. Please wait {wait_time} seconds or reset your password.'
                )
            else:
                # Reset counter
                self.user_attempts = 0
    
    def get_progressive_delay(self):
        """Get the progressive delay based on number of attempts."""
        total_attempts = max(self.ip_attempts, self.user_attempts)
        if total_attempts < len(self.PROGRESSIVE_DELAYS):
            return self.PROGRESSIVE_DELAYS[total_attempts]
        return self.PROGRESSIVE_DELAYS[-1]
    
    def record_failed_attempt(self, email=None):
        """Record a failed login attempt."""
        now = time.time()
        
        # Update IP counter
        if self.ip_key:
            ip_data = cache.get(self.ip_key, {'attempts': 0, 'first_attempt': now})
            ip_data['attempts'] = ip_data.get('attempts', 0) + 1
            if ip_data['attempts'] == 1:
                ip_data['first_attempt'] = now
            cache.set(self.ip_key, ip_data, self.IP_TIMEOUT)
        
        # Update user counter
        if email:
            user_key = self.get_cache_key(self.USER_PREFIX, email.lower())
            user_data = cache.get(user_key, {'attempts': 0, 'first_attempt': now})
            user_data['attempts'] = user_data.get('attempts', 0) + 1
            if user_data['attempts'] == 1:
                user_data['first_attempt'] = now
            cache.set(user_key, user_data, self.USER_TIMEOUT)
    
    def reset_attempts(self, email=None):
        """Reset attempt counters on successful login."""
        if self.ip_key:
            cache.delete(self.ip_key)
        
        if email:
            user_key = self.get_cache_key(self.USER_PREFIX, email.lower())
            cache.delete(user_key)


class RegistrationRateThrottle(BaseThrottle):
    """
    Rate limiting for registration attempts.
    
    - Max 5 registrations per hour per IP
    """
    
    PREFIX = 'register_ip_'
    MAX_ATTEMPTS = 5
    TIMEOUT = 60 * 60  # 1 hour
    
    def get_cache_key(self, ip):
        """Generate a cache key for rate limiting."""
        hashed = hashlib.md5(ip.encode()).hexdigest()
        return f'{self.PREFIX}{hashed}'
    
    def get_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
        return ip
    
    def allow_request(self, request, view):
        """Check if the request should be allowed."""
        if request.method != 'POST':
            return True
        
        ip = self.get_ip(request)
        cache_key = self.get_cache_key(ip)
        
        # Get current attempts
        data = cache.get(cache_key, {'attempts': 0, 'first_attempt': time.time()})
        attempts = data.get('attempts', 0)
        
        if attempts >= self.MAX_ATTEMPTS:
            elapsed = time.time() - data.get('first_attempt', 0)
            if elapsed < self.TIMEOUT:
                wait_time = int(self.TIMEOUT - elapsed)
                raise Throttled(
                    wait=wait_time,
                    detail=f'Too many registration attempts. Please wait {wait_time // 60} minutes.'
                )
            else:
                # Reset counter
                attempts = 0
        
        # Update counter
        now = time.time()
        if attempts == 0:
            data = {'attempts': 1, 'first_attempt': now}
        else:
            data['attempts'] = attempts + 1
        cache.set(cache_key, data, self.TIMEOUT)
        
        return True


class PasswordResetRateThrottle(BaseThrottle):
    """
    Rate limiting for password reset requests.
    
    - Max 3 requests per 15 minutes per email
    - Max 10 requests per hour per IP
    """
    
    EMAIL_PREFIX = 'pwd_reset_email_'
    IP_PREFIX = 'pwd_reset_ip_'
    
    EMAIL_MAX_ATTEMPTS = 3
    EMAIL_TIMEOUT = 15 * 60  # 15 minutes
    
    IP_MAX_ATTEMPTS = 10
    IP_TIMEOUT = 60 * 60  # 1 hour
    
    def get_cache_key(self, prefix, identifier):
        """Generate a cache key for rate limiting."""
        hashed = hashlib.md5(identifier.encode()).hexdigest()
        return f'{prefix}{hashed}'
    
    def get_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
        return ip
    
    def allow_request(self, request, view):
        """Check if the request should be allowed."""
        if request.method != 'POST':
            return True
        
        ip = self.get_ip(request)
        ip_key = self.get_cache_key(self.IP_PREFIX, ip)
        
        # Check IP limit
        ip_data = cache.get(ip_key, {'attempts': 0, 'first_attempt': time.time()})
        ip_attempts = ip_data.get('attempts', 0)
        
        if ip_attempts >= self.IP_MAX_ATTEMPTS:
            elapsed = time.time() - ip_data.get('first_attempt', 0)
            if elapsed < self.IP_TIMEOUT:
                wait_time = int(self.IP_TIMEOUT - elapsed)
                raise Throttled(
                    wait=wait_time,
                    detail=f'Too many password reset requests. Please wait {wait_time // 60} minutes.'
                )
        
        # Update IP counter
        now = time.time()
        if ip_attempts == 0:
            ip_data = {'attempts': 1, 'first_attempt': now}
        else:
            ip_data['attempts'] = ip_attempts + 1
        cache.set(ip_key, ip_data, self.IP_TIMEOUT)
        
        return True
    
    def check_email_throttle(self, email):
        """Check rate limit for specific email."""
        email_key = self.get_cache_key(self.EMAIL_PREFIX, email.lower())
        
        email_data = cache.get(email_key, {'attempts': 0, 'first_attempt': time.time()})
        email_attempts = email_data.get('attempts', 0)
        
        if email_attempts >= self.EMAIL_MAX_ATTEMPTS:
            elapsed = time.time() - email_data.get('first_attempt', 0)
            if elapsed < self.EMAIL_TIMEOUT:
                wait_time = int(self.EMAIL_TIMEOUT - elapsed)
                raise Throttled(
                    wait=wait_time,
                    detail=f'Password reset already requested. Please check your email or wait {wait_time // 60} minutes.'
                )
        
        # Update email counter
        now = time.time()
        if email_attempts == 0:
            email_data = {'attempts': 1, 'first_attempt': now}
        else:
            email_data['attempts'] = email_attempts + 1
        cache.set(email_key, email_data, self.EMAIL_TIMEOUT)
