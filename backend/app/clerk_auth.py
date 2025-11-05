"""
Clerk.dev Authentication for FastAPI - PRODUCTION VERSION
Real Clerk session validation with proper security.
"""
from fastapi import Depends, HTTPException, Request
from typing import Optional
import httpx
import logging
import os

logger = logging.getLogger(__name__)

# Clerk API Configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_BASE = "https://api.clerk.com/v1"

# Try to load from dotenv if not found
if not CLERK_SECRET_KEY:
    try:
        from dotenv import load_dotenv
        load_dotenv()
        CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
    except ImportError:
        pass

if not CLERK_SECRET_KEY:
    logger.warning("CLERK_SECRET_KEY not configured - authentication will fail in production")
    # For development, we can continue without it
    CLERK_SECRET_KEY = "missing"


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


def map_clerk_plan_to_internal(clerk_plan_key: str) -> str:
    """Map Clerk plan keys to internal plan names"""
    mapping = {
        "free_user": "FREE",
        "starter": "STARTER", 
        "pro": "PRO"
    }
    return mapping.get(clerk_plan_key, "FREE")


async def validate_clerk_session(session_token: str) -> Optional[dict]:
    """
    Validate Clerk session token (JWT) with Clerk API.
    Returns session data if valid, None if invalid.
    """
    if CLERK_SECRET_KEY == "missing":
        logger.warning("CLERK_SECRET_KEY not configured - cannot validate sessions")
        return None
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # For JWT session tokens, we need to verify them differently
            # Try to verify the JWT and get current session info
            response = await client.post(
                f"{CLERK_API_BASE}/sessions/{session_token}/verify",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
            )
            
            if response.status_code == 200:
                return response.json()
            
            # If verify endpoint doesn't work, try direct session lookup
            # Extract session ID from JWT if possible
            try:
                import jwt
                import base64
                import json
                
                # Decode JWT payload (without verification for session ID)
                parts = session_token.split('.')
                if len(parts) >= 2:
                    # Decode payload
                    payload_b64 = parts[1]
                    # Add padding if needed
                    payload_b64 += '=' * (4 - len(payload_b64) % 4)
                    payload_bytes = base64.urlsafe_b64decode(payload_b64)
                    payload = json.loads(payload_bytes)
                    
                    session_id = payload.get('sid')  # Session ID from JWT
                    user_id = payload.get('sub')     # User ID from JWT
                    
                    if session_id:
                        # Try to get session by session ID
                        response = await client.get(
                            f"{CLERK_API_BASE}/sessions/{session_id}",
                            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
                        )
                        
                        if response.status_code == 200:
                            session_data = response.json()
                            # Add user_id to session data if not present
                            if 'user_id' not in session_data and user_id:
                                session_data['user_id'] = user_id
                            return session_data
            
            except Exception as jwt_error:
                logger.debug(f"JWT parsing failed: {jwt_error}")
            
            logger.warning(f"Invalid Clerk session: {response.status_code}")
            return None
    
    except Exception as e:
        logger.error(f"Error validating Clerk session: {e}")
        return None


async def get_clerk_user_data(user_id: str) -> Optional[dict]:
    """
    Fetch user data from Clerk API.
    Returns user data if successful, None if failed.
    """
    if CLERK_SECRET_KEY == "missing":
        logger.warning("CLERK_SECRET_KEY not configured - cannot fetch user data")
        return None
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CLERK_API_BASE}/users/{user_id}",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch Clerk user {user_id}: {response.status_code}")
                return None
            
            return response.json()
    
    except Exception as e:
        logger.error(f"Error fetching Clerk user data: {e}")
        return None


async def get_current_user_from_clerk(request: Request) -> Optional[User]:
    """
    Extract and validate user from Clerk session cookies.
    Returns User object if valid session, None if invalid.
    """
    # Look for Clerk session token in cookies
    session_token = None
    
    # Try different possible cookie names that Clerk uses
    for cookie_name in ["__session", "__session_9mLiswkQ"]:
        if cookie_name in request.cookies:
            session_token = request.cookies[cookie_name]
            break
    
    if not session_token:
        logger.debug("No Clerk session token found in cookies")
        return None
    
    # Validate session with Clerk API
    session_data = await validate_clerk_session(session_token)
    if not session_data:
        return None
    
    user_id = session_data.get("user_id")
    if not user_id:
        logger.warning("No user_id in Clerk session data")
        return None
    
    # Always fetch fresh user data from Clerk API for plan information
    # JWT plan claims can be stale after metadata updates
    user_data = await get_clerk_user_data(user_id)
    if not user_data:
        logger.warning(f"Could not fetch user data for {user_id}")
        return None
    
    # Extract user information
    email_addresses = user_data.get("email_addresses", [])
    primary_email = ""
    for email_obj in email_addresses:
        if email_obj.get("id") == user_data.get("primary_email_address_id"):
            primary_email = email_obj.get("email_address", "")
            break
    
    if not primary_email and email_addresses:
        primary_email = email_addresses[0].get("email_address", "")
    
    # Extract plan from FRESH metadata (not from JWT claims)
    public_metadata = user_data.get("public_metadata", {})
    clerk_plan_key = public_metadata.get("plan", "free_user")
    subscription_status = public_metadata.get("subscription_status", "active")
    
    # Map to internal plan
    internal_plan = map_clerk_plan_to_internal(clerk_plan_key)
    
    # If plan is paid but subscription is inactive, downgrade to FREE
    if internal_plan in ["STARTER", "PRO"] and subscription_status != "active":
        logger.info(f"User {user_id} has {internal_plan} plan but inactive subscription, downgrading to FREE")
        internal_plan = "FREE"
    
    # Build full name
    first_name = user_data.get("first_name", "")
    last_name = user_data.get("last_name", "")
    full_name = f"{first_name} {last_name}".strip()
    
    logger.info(f"Authenticated Clerk user: {primary_email} with plan: {internal_plan} (from fresh API data)")
    
    return User(
        id=user_id,
        email=primary_email,
        plan=internal_plan,
        clerk_user_id=user_id,
        full_name=full_name,
        role="user"
    )


async def get_current_user(request: Request) -> User:
    """
    Get current authenticated user - PRODUCTION VERSION.
    Throws 401 if no valid authentication found.
    """
    user = await get_current_user_from_clerk(request)
    
    if not user:
        logger.warning("Authentication failed - no valid Clerk session")
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user


async def get_current_user_unified(request: Request) -> User:
    """
    Unified authentication - alias for get_current_user.
    """
    return await get_current_user(request)


async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Optional authentication - returns None if no valid session.
    Does not throw exceptions.
    """
    try:
        return await get_current_user_from_clerk(request)
    except Exception as e:
        logger.debug(f"Optional auth failed: {e}")
        return None


async def get_current_user_form_upload(request: Request) -> User:
    """
    Authentication for file uploads - same as regular auth.
    """
    return await get_current_user(request)


async def require_auth(request: Request) -> User:
    """
    Require authentication - throws 401 if not authenticated.
    """
    return await get_current_user(request)


async def require_auth_unified(request: Request) -> User:
    """
    Require authentication unified - alias for require_auth.
    """
    return await require_auth(request)


async def require_auth_form_upload(request: Request) -> User:
    """
    Require authentication for form uploads.
    """
    return await require_auth(request)


def require_plan(required: str):
    """
    Plan gating decorator - PRODUCTION VERSION.
    Enforces actual plan restrictions.
    """
    def dep(user: User = Depends(get_current_user)):
        # Define which user plans can access which requirements
        # Key: required plan, Value: user plans that can access it
        access_matrix = {
            "FREE": {"FREE", "STARTER", "PRO"},      # Free features: all plans can access
            "STARTER": {"STARTER", "PRO"},           # Starter features: STARTER and PRO only
            "PRO": {"PRO"}                           # Pro features: PRO only
        }
        
        required_upper = required.upper()
        allowed_user_plans = access_matrix.get(required_upper, {"PRO"})
        
        if user.plan not in allowed_user_plans:
            logger.warning(f"User {user.email} with {user.plan} plan tried to access {required_upper} feature")
            raise HTTPException(
                status_code=403,
                detail=f"{required.title()} plan required. Please upgrade your subscription."
            )
        
        return user
    return dep


def require_plan_unified(required: str):
    """
    Unified plan gating decorator - alias for require_plan.
    """
    return require_plan(required)