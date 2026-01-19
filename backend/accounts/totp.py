"""
Two-Factor Authentication (2FA) using TOTP.

Implements Time-based One-Time Password (TOTP) authentication
compatible with Google Authenticator, Authy, and similar apps.
"""
import base64
import io
import secrets
from urllib.parse import quote

import pyotp
import qrcode
from qrcode.image.pure import PyPNGImage


def generate_totp_secret():
    """
    Generate a new TOTP secret key.
    
    Returns a 32-character base32 encoded string.
    """
    return pyotp.random_base32()


def get_totp_uri(secret, email, issuer='mkv2cast'):
    """
    Generate the TOTP provisioning URI for QR code generation.
    
    Args:
        secret: The TOTP secret key
        email: User's email address
        issuer: Application name (shown in authenticator app)
    
    Returns:
        otpauth URI string
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code(uri):
    """
    Generate a QR code image for the TOTP URI.
    
    Args:
        uri: The otpauth URI string
    
    Returns:
        Base64 encoded PNG image data
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white", image_factory=PyPNGImage)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer)
    buffer.seek(0)
    
    base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{base64_image}"


def verify_totp(secret, code, valid_window=1):
    """
    Verify a TOTP code.
    
    Args:
        secret: The user's TOTP secret
        code: The 6-digit code to verify
        valid_window: Number of time steps to allow (default 1 = ±30 seconds)
    
    Returns:
        True if code is valid, False otherwise
    """
    if not secret or not code:
        return False
    
    # Clean the code (remove spaces and dashes)
    code = str(code).replace(' ', '').replace('-', '')
    
    # Validate code format
    if not code.isdigit() or len(code) != 6:
        return False
    
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=valid_window)


def generate_backup_codes(count=10):
    """
    Generate backup codes for 2FA recovery.
    
    Args:
        count: Number of backup codes to generate
    
    Returns:
        List of 8-character uppercase hex codes
    """
    return [secrets.token_hex(4).upper() for _ in range(count)]


def format_backup_codes(codes):
    """
    Format backup codes for display (add dashes for readability).
    
    Example: 'A1B2C3D4' -> 'A1B2-C3D4'
    """
    return [f"{code[:4]}-{code[4:]}" for code in codes]


class TOTPManager:
    """
    Manager class for handling TOTP operations for a user.
    """
    
    def __init__(self, user):
        """
        Initialize the TOTP manager for a user.
        
        Args:
            user: User model instance
        """
        self.user = user
    
    def setup(self, issuer='mkv2cast'):
        """
        Initialize TOTP setup for the user.
        
        Generates a new secret (does not enable 2FA yet).
        Returns the QR code and secret for user to scan/save.
        """
        # Generate new secret
        secret = generate_totp_secret()
        
        # Generate provisioning URI
        uri = get_totp_uri(secret, self.user.email, issuer)
        
        # Generate QR code
        qr_code = generate_qr_code(uri)
        
        # Store secret temporarily (not enabled until verified)
        self.user.totp_secret = secret
        self.user.save(update_fields=['totp_secret'])
        
        return {
            'secret': secret,
            'qr_code': qr_code,
            'uri': uri,
        }
    
    def verify_and_enable(self, code):
        """
        Verify a TOTP code and enable 2FA.
        
        This should be called after setup() when user provides the first code
        from their authenticator app.
        
        Args:
            code: The 6-digit code from authenticator
        
        Returns:
            dict with success status and backup codes if successful
        """
        if not self.user.totp_secret:
            return {'success': False, 'error': '2FA setup not initialized'}
        
        if not verify_totp(self.user.totp_secret, code):
            return {'success': False, 'error': 'Invalid code'}
        
        # Generate backup codes
        backup_codes = generate_backup_codes()
        
        # Enable 2FA
        self.user.totp_enabled = True
        self.user.backup_codes = backup_codes
        self.user.save(update_fields=['totp_enabled', 'backup_codes'])
        
        return {
            'success': True,
            'backup_codes': format_backup_codes(backup_codes),
        }
    
    def verify(self, code):
        """
        Verify a TOTP code during login.
        
        Args:
            code: The 6-digit code from authenticator
        
        Returns:
            True if valid, False otherwise
        """
        if not self.user.totp_enabled or not self.user.totp_secret:
            return False
        
        return verify_totp(self.user.totp_secret, code)
    
    def verify_backup_code(self, code):
        """
        Verify and use a backup code.
        
        Args:
            code: The backup code (with or without dash)
        
        Returns:
            True if valid (code is consumed), False otherwise
        """
        if not self.user.totp_enabled:
            return False
        
        return self.user.use_backup_code(code)
    
    def disable(self):
        """
        Disable 2FA for the user.
        
        Clears secret and backup codes.
        """
        self.user.totp_secret = None
        self.user.totp_enabled = False
        self.user.backup_codes = []
        self.user.save(update_fields=['totp_secret', 'totp_enabled', 'backup_codes'])
    
    def regenerate_backup_codes(self):
        """
        Generate new backup codes (invalidates old ones).
        
        Returns:
            List of new formatted backup codes
        """
        if not self.user.totp_enabled:
            return None
        
        backup_codes = generate_backup_codes()
        self.user.backup_codes = backup_codes
        self.user.save(update_fields=['backup_codes'])
        
        return format_backup_codes(backup_codes)
    
    @property
    def is_enabled(self):
        """Check if 2FA is enabled for the user."""
        return self.user.totp_enabled
    
    @property
    def backup_codes_remaining(self):
        """Get the number of unused backup codes."""
        return len(self.user.backup_codes) if self.user.backup_codes else 0
