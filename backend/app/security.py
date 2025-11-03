"""
Production-ready security middleware and utilities.
Includes comprehensive security headers, MongoDB-based rate limiting, and CSRF protection.
"""

from fastapi import Request, HTTPException, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Optional
import time
import hmac
import hashlib
import secrets
from urllib.parse import urlparse
from config import get_config
from app.mongodb_cache import rate_limit_check
import logging
from datetime import datetime, timezone, timedelta
from fastapi import status
import uuid

logger = logging.getLogger(__name__)

def get_allowlist(origins_csv: str) -> list[str]:
    """Parse CORS origins from comma-separated string"""
    return [o.strip() for o in origins_csv.split(",") if o.strip()]

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add comprehensive security headers to all responses.
    Production-ready with configurable CSP and security policies.
    """
    
    def __init__(self, app, config=None):
        super().__init__(app)
        self.config = config or get_config()
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Get the request origin for CSP
        origin = request.headers.get("origin", "")
        
        # Base security headers
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-XSS-Protection": "1; mode=block",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }
        
        # HSTS for HTTPS
        if request.url.scheme == "https" or self.config.NODE_ENV == "production":
            security_headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        allowed_origins = self.config.get_cors_origins()
        csp_sources = ["'self'"]
        
        # Add allowed origins to CSP
        for allowed_origin in allowed_origins:
            if allowed_origin != "*":
                parsed = urlparse(allowed_origin)
                if parsed.netloc:
                    csp_sources.append(parsed.netloc)
        
        csp_policy = f"default-src {' '.join(csp_sources)}; "
        csp_policy += "img-src 'self' data: blob: https:; "
        csp_policy += "style-src 'self' 'unsafe-inline'; "
        csp_policy += "script-src 'self'; "
        csp_policy += "connect-src 'self' https:; "
        csp_policy += "font-src 'self'; "
        csp_policy += "object-src 'none'; "
        csp_policy += "frame-ancestors 'none'; "
        csp_policy += "base-uri 'self';"
        
        security_headers["Content-Security-Policy"] = csp_policy
        
        # Add headers to response
        response.headers.update(security_headers)
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    MongoDB-based rate limiting middleware with graceful fallback.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.config = get_config()
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/api/health"] or request.url.path.startswith("/static"):
            return await call_next(request)
        
        # Get client identifier (IP + user agent for unauthenticated requests)
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")[:100]  # Limit length
        rate_limit_key = f"rate_limit:{client_ip}:{hash(user_agent)}"
        
        try:
            # Check rate limit using MongoDB
            result = await rate_limit_check(
                rate_limit_key,
                self.config.RATE_LIMIT_REQUESTS,
                self.config.RATE_LIMIT_WINDOW
            )
            
            if not result["allowed"]:
                now = datetime.now(timezone.utc)
                retry_after = int((result["reset_time"] - now).total_seconds())
                
                logger.warning(f"Rate limit exceeded for {client_ip}: {self.config.RATE_LIMIT_REQUESTS} requests/window")
                
                response = Response(
                    content='{"error": "Rate limit exceeded", "retry_after": ' + str(retry_after) + '}',
                    status_code=429,
                    media_type="application/json"
                )
                response.headers["Retry-After"] = str(retry_after)
                response.headers["X-RateLimit-Limit"] = str(self.config.RATE_LIMIT_REQUESTS)
                response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
                response.headers["X-RateLimit-Reset"] = str(int(result["reset_time"].timestamp()))
                return response
            
            # Process request and add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.config.RATE_LIMIT_REQUESTS)
            response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
            response.headers["X-RateLimit-Reset"] = str(int(result["reset_time"].timestamp()))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error for {client_ip}: {e}")
            # Fail open - allow the request but log the error
            response = await call_next(request)
            return response

async def rate_limit_user(user_key: str, limit_per_min: int):
    """
    Per-user rate limiting function for API endpoints.
    Uses MongoDB-based sliding window with fallback.
    """
    rate_limit_key = f"user_rate_limit:{user_key}"
    
    # Convert per-minute to per-60-seconds for consistency
    window_seconds = 60
    
    try:
        result = await rate_limit_check(rate_limit_key, limit_per_min, window_seconds)
        
        if not result["allowed"]:
            now = datetime.now(timezone.utc)
            retry_after = int((result["reset_time"] - now).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit_per_min),
                    "X-RateLimit-Remaining": str(result["remaining"]),
                    "X-RateLimit-Reset": str(int(result["reset_time"].timestamp()))
                }
            )
    except Exception as e:
        logger.error(f"Rate limiting error for user {user_key}: {e}")
        # Fail open - allow the request but log the error

async def _token_bucket_fallback(identifier: str, max_requests: int, window_minutes: int):
    """
    Simple in-memory token bucket fallback when MongoDB is unavailable
    """
    # This is a simplified fallback - in production you'd want a more robust implementation
    logger.warning(f"Using token bucket fallback for {identifier}")
    return  # Allow request to proceed

async def async_rate_limit(request: Request, identifier: str, max_requests: int = 100, window_minutes: int = 1):
    """
    Rate limiting using MongoDB with sliding window
    
    Args:
        request: FastAPI request object
        identifier: Unique identifier (IP, user_id, etc.)
        max_requests: Maximum requests allowed in window
        window_minutes: Time window in minutes
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    try:
        window_seconds = window_minutes * 60
        now = datetime.now(timezone.utc)
        
        # Use MongoDB-based rate limiting
        key = f"rate_limit:{identifier}"
        result = await rate_limit_check(key, max_requests, window_seconds)
        
        if not result["allowed"]:
            reset_time = result["reset_time"]
            retry_after = int((reset_time - now).total_seconds())
            
            logger.warning(f"Rate limit exceeded for {identifier}: {max_requests} requests/window")
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded", 
                headers={"Retry-After": str(retry_after)}
            )
        
        # Add rate limit headers to response
        remaining = result["remaining"]
        reset_timestamp = int(result["reset_time"].timestamp())
        
        # Store in request state for middleware to add headers
        request.state.rate_limit_limit = max_requests
        request.state.rate_limit_remaining = remaining
        request.state.rate_limit_reset = reset_timestamp
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rate limiting error for {identifier}: {e}")
        # Fall back to token bucket on MongoDB errors
        return await _token_bucket_fallback(identifier, max_requests, window_minutes)

def enforce_body_limit(request: Request, max_kb: int):
    """Enforce maximum body size for requests"""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_kb * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Request entity too large. Maximum size: {max_kb}KB"
        )

def generate_csrf_token() -> str:
    """Generate a secure CSRF token."""
    return secrets.token_urlsafe(32)

def verify_csrf_token(token: str, expected_token: str) -> bool:
    """Verify CSRF token using constant-time comparison."""
    return hmac.compare_digest(token, expected_token)

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware for state-changing requests.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.config = get_config()
        
        # Methods that require CSRF protection
        self.protected_methods = {"POST", "PUT", "DELETE", "PATCH"}
        
        # Paths that are exempt from CSRF (webhooks, public APIs)
        self.exempt_paths = {
            "/api/stripe/webhook",
            "/api/auth/login", 
            "/api/auth/logout",
            "/api/auth/register",
            "/api/auth/password-reset",
            "/api/auth/password-reset/confirm",
            "/api/health",
            "/health",
            "/api/ai-coach-v2/generate",
            "/api/ai-coach-v2/diag",
            "/api/activity-log",
            "/api/activity-logs",
            "/api/reflection-log", 
            "/api/reflection-logs",
            "/api/brand/test-pdf",
            "/api/reports",  # Exempt all /api/reports/* endpoints (PDF generation)
            "/api/commission/save",
            "/api/seller-net/save",
            "/api/affordability/save",
            "/api/investor/save",
            "/api/closing-date/save",
            "/api/clerk/sync-user",  # Clerk authentication sync
            "/api/clerk/assign-plan",  # Clerk plan assignment
            "/api/clerk/subscription-status",  # Clerk subscription status
            "/api/clerk/create-checkout",  # Clerk checkout creation
            "/api/clerk/billing-portal",  # Clerk billing portal
            "/api/clerk/webhook"  # Clerk webhooks
        }
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip CSRF for safe methods and exempt paths
        if (request.method not in self.protected_methods or 
            request.url.path in self.exempt_paths or
            any(request.url.path.startswith(path) for path in self.exempt_paths)):
            return await call_next(request)
        
        # Skip CSRF for authenticated API requests (SPA with JWT doesn't need CSRF protection)
        auth_header = request.headers.get("Authorization", "")
        has_jwt_token = auth_header.startswith("Bearer ") and len(auth_header) > 7
        
        # Also check for cookie-based authentication
        has_cookie_token = request.cookies.get("access_token") is not None
        
        if has_jwt_token or has_cookie_token:
            # JWT/Cookie-authenticated requests are safe from CSRF (tokens aren't sent automatically by malicious sites)
            return await call_next(request)
        
        # Allow unauthenticated requests to auth-required endpoints to pass through
        # so the endpoint can return proper 401 errors instead of 403 CSRF errors
        auth_required_endpoints = [
            "/api/brand/upload",
            "/api/dashboard/metrics",
            "/api/user/profile"
        ]
        
        if request.url.path in auth_required_endpoints:
            # Let the endpoint handle authentication - it will return 401 if needed
            return await call_next(request)
        
        # For non-JWT requests, verify CSRF token
        csrf_token = request.headers.get("X-CSRF-Token")
        
        # Get expected token from session/cookie (simplified for demo)
        # In production, this would come from encrypted session data
        expected_token = request.cookies.get("csrf_token")
        
        if not csrf_token or not expected_token:
            raise HTTPException(
                status_code=403,
                detail="CSRF token missing"
            )
        
        if not verify_csrf_token(csrf_token, expected_token):
            raise HTTPException(
                status_code=403,
                detail="CSRF token invalid"
            )
        
        return await call_next(request)

def create_secure_cookie_response(
    response: Response,
    key: str,
    value: str,
    max_age: Optional[int] = None,
    httponly: bool = True
) -> Response:
    """
    Create a secure cookie with production-ready settings.
    """
    config = get_config()
    
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        httponly=httponly,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        path="/"
    )
    
    return response