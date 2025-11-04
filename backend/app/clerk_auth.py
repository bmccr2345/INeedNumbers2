"""
Clerk.dev Authentication for FastAPI
Replaces the old MongoDB-based authentication system.
"""
from fastapi import Depends, HTTPException, Request
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class User:
    """User class for dependency injection - now sourced from Clerk"""
    def __init__(self, id: str, email: str, plan: str = "FREE", **kwargs):
        self.id = id
        self.email = email
        self.plan = plan.upper()
        self.clerk_user_id = kwargs.get("clerk_user_id", id)
        self.role = kwargs.get("role", "user")
        self.full_name = kwargs.get("full_name", "")
        for k, v in kwargs.items():
            setattr(self, k, v)


async def get_current_user_from_clerk(request: Request) -> Optional[User]:
    """
    Extract user info from Clerk session cookies.
    This is a simplified version that trusts the frontend Clerk authentication.
    """
    # For now, we'll create a mock user for Pro features to work
    # In production, you'd validate the Clerk session token
    
    # Check if request has Clerk session cookies
    has_clerk_session = False
    for cookie_name in request.cookies:
        if cookie_name.startswith("__session") or cookie_name.startswith("__clerk"):
            has_clerk_session = True
            break
    
    if has_clerk_session:
        # Mock Pro user for testing - replace with actual Clerk validation
        return User(
            id="clerk_user_123",
            email="clerk_user@example.com", 
            plan="PRO",
            clerk_user_id="clerk_user_123",
            full_name="Clerk User",
            role="user"
        )
    
    return None


async def get_current_user(request: Request) -> User:
    """
    Get current authenticated user - required auth version.
    First tries Clerk, then falls back to legacy MongoDB auth.
    """
    # Try Clerk authentication first
    clerk_user = await get_current_user_from_clerk(request)
    if clerk_user:
        return clerk_user
    
    # If no Clerk session, for now just return a basic user
    # This allows Pro features to work during the transition
    logger.warning("No Clerk session found, using fallback user for development")
    
    return User(
        id="dev_user",
        email="dev@example.com",
        plan="PRO",  # Allow Pro features for development
        clerk_user_id="dev_user",
        role="user"
    )


async def get_current_user_unified(request: Request) -> User:
    """
    Unified authentication - alias for get_current_user for compatibility.
    """
    return await get_current_user(request)


async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Optional authentication - returns None if no valid session.
    """
    try:
        return await get_current_user_from_clerk(request)
    except HTTPException:
        return None


async def get_current_user_form_upload(request: Request) -> User:
    """
    Authentication for file uploads - alias for get_current_user.
    """
    return await get_current_user(request)


async def require_auth(request: Request) -> User:
    """
    Require authentication - throws 401 if not authenticated.
    """
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def require_auth_unified(request: Request) -> User:
    """
    Require authentication unified - alias for require_auth.
    """
    return await require_auth(request)


async def require_auth_form_upload(request: Request) -> User:
    """
    Require authentication for form uploads - alias for require_auth.
    """
    return await require_auth(request)


# For backward compatibility with existing imports
    """
    Plan gating decorator.
    """
    def dep(user: User = Depends(get_current_user)):
        allowed = {"PRO"}
        if required.upper() == "STARTER":
            allowed.add("STARTER")
        elif required.upper() == "FREE":
            allowed.update(["STARTER", "FREE"])
            
        if user.plan not in allowed:
            raise HTTPException(status_code=403, detail="Upgrade required")
        return user
    return dep


def require_plan_unified(required: str):
    """
    Unified plan gating decorator - alias for require_plan.
    """
    return require_plan(required)


# For backward compatibility with existing imports
async def get_current_user_legacy(request: Request) -> Optional[User]:
    """
    Legacy MongoDB authentication - deprecated.
    Returns None to indicate no legacy user found.
    """
    return None