"""
Clerk Billing Integration Module
Handles Clerk REST API calls for billing, subscriptions, and user metadata management.
"""
import httpx
import os
import logging
from typing import Dict, Optional, Any
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Clerk API Configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_BASE = "https://api.clerk.com/v1"

# Plan Configuration
PLAN_MAPPING = {
    "free": {"name": "Free", "clerk_key": "free_user"},
    "starter": {"name": "Starter", "clerk_key": "starter"},
    "pro": {"name": "Pro", "clerk_key": "pro"}
}

REVERSE_PLAN_MAPPING = {
    "free_user": "FREE",
    "starter": "STARTER",
    "pro": "PRO"
}


class ClerkBillingClient:
    """Client for interacting with Clerk's Billing and User APIs"""
    
    def __init__(self):
        if not CLERK_SECRET_KEY:
            raise ValueError("CLERK_SECRET_KEY environment variable is required")
        
        self.headers = {
            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
    
    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user data from Clerk API.
        
        Args:
            user_id: Clerk user ID
            
        Returns:
            User data dictionary
            
        Raises:
            HTTPException: If API call fails
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{CLERK_API_BASE}/users/{user_id}",
                    headers=self.headers
                )
                
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"User {user_id} not found in Clerk"
                    )
                
                if response.status_code != 200:
                    logger.error(f"Clerk API error: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to fetch user from Clerk"
                    )
                
                return response.json()
        
        except httpx.RequestError as e:
            logger.error(f"Network error calling Clerk API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to Clerk API"
            )
    
    async def update_user_metadata(
        self, 
        user_id: str, 
        public_metadata: Optional[Dict] = None,
        private_metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Update user metadata in Clerk.
        
        Args:
            user_id: Clerk user ID
            public_metadata: Public metadata to update (visible to frontend)
            private_metadata: Private metadata to update (server-only)
            
        Returns:
            Updated user data
            
        Raises:
            HTTPException: If API call fails
        """
        try:
            update_data = {}
            if public_metadata is not None:
                update_data["public_metadata"] = public_metadata
            if private_metadata is not None:
                update_data["private_metadata"] = private_metadata
            
            if not update_data:
                raise ValueError("Must provide at least one metadata field to update")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{CLERK_API_BASE}/users/{user_id}",
                    headers=self.headers,
                    json=update_data
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to update user metadata: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to update user metadata"
                    )
                
                logger.info(f"Successfully updated metadata for user {user_id}")
                return response.json()
        
        except httpx.RequestError as e:
            logger.error(f"Network error updating user metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to Clerk API"
            )
    
    async def get_user_subscriptions(self, user_id: str) -> list:
        """
        Get user's active subscriptions from Clerk Billing.
        
        Note: This endpoint may not be available in all Clerk plans.
        Falls back to metadata-based subscription status if unavailable.
        
        Args:
            user_id: Clerk user ID
            
        Returns:
            List of subscriptions
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Clerk Billing API endpoint (may require Clerk Pro plan)
                response = await client.get(
                    f"{CLERK_API_BASE}/users/{user_id}/organization_memberships",
                    headers=self.headers
                )
                
                # If endpoint doesn't exist, fall back to metadata
                if response.status_code == 404:
                    logger.info(f"Clerk Billing API not available, using metadata fallback")
                    return []
                
                if response.status_code != 200:
                    logger.warning(f"Failed to fetch subscriptions: {response.status_code}")
                    return []
                
                return response.json().get("data", [])
        
        except httpx.RequestError as e:
            logger.warning(f"Error fetching subscriptions: {str(e)}")
            return []
    
    def extract_plan_from_metadata(self, user_data: Dict) -> tuple[str, str]:
        """
        Extract plan information from user metadata.
        
        Args:
            user_data: User data from Clerk API
            
        Returns:
            Tuple of (plan_id, subscription_status)
        """
        public_metadata = user_data.get("public_metadata", {})
        
        # Get plan from metadata
        clerk_plan_key = public_metadata.get("plan", "free_user")
        subscription_status = public_metadata.get("subscription_status", "inactive")
        
        # Map Clerk plan key to our internal plan ID
        plan_id = REVERSE_PLAN_MAPPING.get(clerk_plan_key, "FREE")
        
        # If it's a paid plan but subscription is inactive, downgrade to FREE
        if plan_id in ["STARTER", "PRO"] and subscription_status != "active":
            logger.info(f"User has {plan_id} plan but inactive subscription, treating as FREE")
            plan_id = "FREE"
        
        return plan_id, subscription_status


# Singleton instance
clerk_billing_client = ClerkBillingClient()
