"""
Clerk Authentication Middleware for FastAPI
Validates Clerk session tokens on protected endpoints.
"""
import os
import httpx
import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_BASE = "https://api.clerk.com/v1"


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate Clerk session tokens.
    Extracts user info from Clerk and attaches to request.state.
    """
    
    def __init__(self, app):
        super().__init__(app)
        
        # Endpoints that don't require authentication
        self.public_paths = {
            "/api/health",
            "/health",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/logout",
            "/api/auth/password-reset",
            "/api/clerk/webhook",
            "/api/stripe/webhook",
            "/docs",
            "/redoc",
            "/openapi.json"
        }
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip authentication for public paths
        if (request.url.path in self.public_paths or 
            any(request.url.path.startswith(path) for path in self.public_paths)):
            return await call_next(request)
        
        # Skip authentication for non-API paths
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Try to get Clerk session from cookies
        clerk_session_token = None
        
        # Check for __session cookie (Clerk's default)
        for cookie_name in request.cookies:
            if cookie_name.startswith("__session"):
                clerk_session_token = request.cookies[cookie_name]
                break
        
        # Also check Authorization header as fallback
        if not clerk_session_token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                clerk_session_token = auth_header[7:]
        
        if not clerk_session_token:
            # No Clerk session - try legacy auth as fallback
            logger.debug(f"No Clerk session found for {request.url.path}")
            return await call_next(request)
        
        # Validate session with Clerk API
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Verify the session token
                response = await client.get(
                    f"{CLERK_API_BASE}/sessions/{clerk_session_token}/verify",
                    headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
                )
                
                if response.status_code == 200:
                    session_data = response.json()
                    user_id = session_data.get("user_id")
                    
                    if user_id:
                        # Get user data from Clerk
                        user_response = await client.get(
                            f"{CLERK_API_BASE}/users/{user_id}",
                            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
                        )
                        
                        if user_response.status_code == 200:
                            user_data = user_response.json()
                            
                            # Extract plan from metadata
                            clerk_plan_key = user_data.get("public_metadata", {}).get("plan", "free_user")
                            plan_mapping = {
                                "free_user": "FREE",
                                "starter": "STARTER",
                                "pro": "PRO"
                            }
                            plan = plan_mapping.get(clerk_plan_key, "FREE")
                            
                            # Attach user info to request
                            request.state.user = {
                                "id": user_id,
                                "email": user_data.get("email_addresses", [{}])[0].get("email_address"),
                                "plan": plan,
                                "clerk_user_id": user_id
                            }
                            
                            logger.debug(f"Clerk user authenticated: {user_id}, plan: {plan}")
                else:
                    logger.warning(f"Invalid Clerk session: {response.status_code}")
        
        except Exception as e:
            logger.error(f"Error validating Clerk session: {e}")
        
        return await call_next(request)


async def get_current_user(request: Request):
    """
    Dependency to get current authenticated user.
    Works with both Clerk and legacy auth.
    """
    # Check if Clerk user is attached
    if hasattr(request.state, "user") and request.state.user:
        return request.state.user
    
    # Fallback to legacy auth cookie
    # (This will be removed eventually)
    return None
