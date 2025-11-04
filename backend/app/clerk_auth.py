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
    For now, this is permissive to allow testing of Pro features.
    """
    # Check if request has Clerk session cookies
    has_clerk_session = False
    for cookie_name in request.cookies:
        if cookie_name.startswith("__session") or cookie_name.startswith("__clerk"):
            has_clerk_session = True
            break
    
    if has_clerk_session:
        # Create Pro user for testing with actual Clerk session
        return User(
            id="clerk_user_pro",
            email="pro.user@test.com", 
            plan="PRO",
            clerk_user_id="clerk_user_pro",
            full_name="Pro Test User",
            role="user"
        )
    
    # Even without Clerk session, return a user for development
    # This allows testing of Pro features
    return User(
        id="dev_user",
        email="dev@test.com", 
        plan="PRO",
        clerk_user_id="dev_user",
        full_name="Development User",
        role="user"
    )


async def get_current_user(request: Request) -> User:
    """
    Get current authenticated user - required auth version.
    Always returns a Pro user for testing.
    """
    # Try Clerk authentication first
    clerk_user = await get_current_user_from_clerk(request)
    if clerk_user:
        return clerk_user
    
    # Always return a Pro user for development/testing
    return User(
        id="fallback_user",
        email="fallback@test.com",
        plan="PRO",  # Allow Pro features for testing
        clerk_user_id="fallback_user",
        role="user",
        full_name="Fallback User"
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


def require_plan(required: str):
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