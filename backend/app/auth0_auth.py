"""
Auth0 JWT validation and authentication module for I Need Numbers.
This module provides JWT token validation for Auth0-based authentication.
"""

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError, DecodeError, ExpiredSignatureError, InvalidTokenError
import logging
from config import get_config

logger = logging.getLogger(__name__)

class UnauthorizedException(HTTPException):
    """Exception for unauthorized access attempts"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class ForbiddenException(HTTPException):
    """Exception for forbidden access (no credentials provided)"""
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class Auth0TokenVerifier:
    """
    Verifies Auth0 JWT tokens using JWKS endpoint.
    Validates token signature, expiration, audience, and issuer.
    """
    
    def __init__(self):
        self.config = get_config()
        
        # Check if Auth0 is configured
        if not self.config.AUTH0_DOMAIN:
            logger.warning("AUTH0_DOMAIN not configured - Auth0 authentication will be unavailable")
            self.jwks_client = None
            self.enabled = False
            return
        
        # Initialize JWKS client for Auth0 public key retrieval
        jwks_url = f'https://{self.config.AUTH0_DOMAIN}/.well-known/jwks.json'
        self.jwks_client = PyJWKClient(jwks_url)
        self.enabled = True
        logger.info(f"Auth0 token verifier initialized: {self.config.AUTH0_DOMAIN}")
    
    async def verify(
        self,
        token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
    ) -> dict:
        """
        Verify Auth0 JWT token and return payload.
        
        Args:
            token: Bearer token from Authorization header
            
        Returns:
            dict: Decoded JWT payload with user claims
            
        Raises:
            ForbiddenException: If no token provided
            UnauthorizedException: If token is invalid
        """
        
        # Check if Auth0 is enabled
        if not self.enabled:
            raise UnauthorizedException("Auth0 authentication not configured")
        
        # Check if token was provided
        if token is None:
            raise ForbiddenException("Authentication required")
        
        # Extract token string
        token_string = token.credentials
        
        # Get signing key from Auth0 JWKS endpoint
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token_string).key
        except PyJWKClientError as error:
            logger.error(f"Failed to get signing key: {error}")
            raise UnauthorizedException(f"Unable to verify token: {str(error)}")
        except DecodeError as error:
            logger.error(f"Token decode error: {error}")
            raise UnauthorizedException(f"Invalid token format: {str(error)}")
        
        # Decode and validate JWT
        try:
            payload = jwt.decode(
                token_string,
                signing_key,
                algorithms=[self.config.AUTH0_ALGORITHMS],
                audience=self.config.AUTH0_AUDIENCE,
                issuer=f'https://{self.config.AUTH0_DOMAIN}/',
            )
            
            logger.debug(f"Token verified successfully for user: {payload.get('sub')}")
            return payload
            
        except ExpiredSignatureError:
            logger.warning("Token has expired")
            raise UnauthorizedException("Token has expired")
        except InvalidTokenError as error:
            logger.error(f"Invalid token: {error}")
            raise UnauthorizedException(f"Invalid token: {str(error)}")

# Global verifier instance
_auth0_verifier: Optional[Auth0TokenVerifier] = None

def get_auth0_verifier() -> Auth0TokenVerifier:
    """Get singleton Auth0 token verifier instance"""
    global _auth0_verifier
    if _auth0_verifier is None:
        _auth0_verifier = Auth0TokenVerifier()
    return _auth0_verifier

async def verify_auth0_token(
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> dict:
    """
    Dependency function to verify Auth0 token.
    Use this in route dependencies: Depends(verify_auth0_token)
    
    Returns:
        dict: Decoded JWT payload
    """
    verifier = get_auth0_verifier()
    return await verifier.verify(token)

async def get_current_user_auth0(
    request: Request,
    token_payload: dict = Depends(verify_auth0_token)
) -> dict:
    """
    Extract current user information from Auth0 token payload.
    
    Returns:
        dict: User information from token
            - sub: Auth0 user ID (e.g., "auth0|123456")
            - email: User email address
            - email_verified: Email verification status
            - name: User's full name (if available)
    """
    return {
        "auth0_sub": token_payload.get("sub"),
        "email": token_payload.get("email"),
        "email_verified": token_payload.get("email_verified", False),
        "name": token_payload.get("name", ""),
        "token_payload": token_payload  # Full payload for advanced use cases
    }

async def require_auth0(
    user: dict = Depends(get_current_user_auth0)
) -> dict:
    """
    Require Auth0 authentication for a route.
    Alias for get_current_user_auth0 for clarity in route definitions.
    
    Usage:
        @app.get("/api/protected")
        async def protected_route(user: dict = Depends(require_auth0)):
            return {"message": f"Hello {user['email']}"}
    """
    return user

# Optional: Hybrid authentication support (Auth0 OR legacy cookie-based)
async def get_current_user_hybrid(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Support both Auth0 JWT tokens and legacy cookie-based authentication.
    This allows gradual migration from old auth to Auth0.
    
    Returns:
        dict: User information (from Auth0 or legacy system)
        None: If no valid authentication found
    """
    # Try Auth0 first
    if token is not None:
        try:
            verifier = get_auth0_verifier()
            if verifier.enabled:
                token_payload = await verifier.verify(token)
                return {
                    "auth0_sub": token_payload.get("sub"),
                    "email": token_payload.get("email"),
                    "auth_method": "auth0"
                }
        except (UnauthorizedException, ForbiddenException):
            pass  # Fall through to legacy auth
    
    # Try legacy cookie-based authentication
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            # Import legacy auth functions
            from jose import jwt as legacy_jwt
            from jose.exceptions import JWTError
            
            config = get_config()
            payload = legacy_jwt.decode(
                access_token,
                config.JWT_SECRET_KEY,
                algorithms=["HS256"]
            )
            
            # Return user in Auth0-compatible format
            return {
                "user_id": payload.get("sub"),
                "auth_method": "legacy"
            }
        except JWTError:
            pass  # Invalid legacy token
    
    return None
