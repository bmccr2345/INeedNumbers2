"""
Onboarding API Endpoints
Handles saving partial onboarding data and completing the onboarding flow
"""
from fastapi import APIRouter, Depends, HTTPException
from app.models.onboarding_profile import (
    OnboardingProfile,
    OnboardingSaveRequest,
    OnboardingCompleteResponse
)
from app.services.onboarding_service import (
    save_onboarding_data,
    complete_onboarding
)
from app.clerk_auth import get_current_user_unified
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Import db from server module
from server import db


@router.post("/save")
async def save_onboarding(
    request: OnboardingSaveRequest,
    user=Depends(get_current_user_unified)
):
    """
    Save partial onboarding data
    
    This endpoint allows saving progress as the user moves through onboarding screens.
    Can be called multiple times to update different parts of the profile.
    """
    try:
        profile_data = await save_onboarding_data(db, user.id, request.profile)
        
        return {
            "success": True,
            "profile": profile_data,
            "message": "Onboarding data saved successfully"
        }
        
    except ValueError as e:
        logger.error(f"Validation error saving onboarding for user {user.id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving onboarding for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save onboarding data")


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding_flow(
    user=Depends(get_current_user_unified),
    db=Depends(get_db)
):
    """
    Complete onboarding and initialize user dashboard
    
    This endpoint:
    1. Marks onboarding as complete
    2. Initializes goals based on onboarding data
    3. Creates weekly plan
    4. Configures commission defaults
    5. Generates dashboard starter data (weekly plan, goals, first steps checklist)
    
    Returns complete profile and dashboard initialization data.
    """
    try:
        result = await complete_onboarding(db, user.id)
        
        return OnboardingCompleteResponse(
            profile=OnboardingProfile(**result["profile"]),
            dashboard=result["dashboard"]
        )
        
    except ValueError as e:
        logger.error(f"Validation error completing onboarding for user {user.id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error completing onboarding for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete onboarding")


@router.get("/status")
async def get_onboarding_status(
    user=Depends(get_current_user_unified),
    db=Depends(get_db)
):
    """
    Get current onboarding status for user
    
    Returns:
    - onboarding_completed: boolean
    - onboarding_profile: partial or complete profile data
    """
    try:
        user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        onboarding_profile = user_doc.get("onboarding_profile", {})
        
        return {
            "onboarding_completed": onboarding_profile.get("onboarding_completed", False),
            "onboarding_profile": onboarding_profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting onboarding status for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get onboarding status")
