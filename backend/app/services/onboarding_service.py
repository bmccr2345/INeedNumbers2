"""
Onboarding Service
Handles saving onboarding data and triggering initialization of goals, plans, and defaults
"""
from datetime import datetime, timezone
from typing import Dict, Any
from app.models.onboarding_profile import OnboardingProfile, CommissionSettings, WeeklyFocus
import logging

logger = logging.getLogger(__name__)


async def save_onboarding_data(db, user_id: str, profile_data: OnboardingProfile) -> Dict[str, Any]:
    """
    Save partial onboarding data to user profile
    Uses upsert to create user if not exists (fixes "User not found" bug)
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        profile_data: OnboardingProfile data
        
    Returns:
        Updated profile dictionary
    """
    try:
        # Prepare update data
        update_data = {
            "onboarding_profile": profile_data.dict(exclude_none=True),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Use upsert to create user if not exists
        result = await db.users.update_one(
            {"clerk_user_id": user_id},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "clerk_user_id": user_id,
                    "created_at": datetime.now(timezone.utc),
                    "first_login": None  # Will be set on first dashboard visit
                }
            },
            upsert=True
        )
        
        if result.upserted_id:
            logger.info(f"Created new user {user_id} during onboarding save")
        else:
            logger.info(f"Saved onboarding data for existing user {user_id}")
        
        return profile_data.dict()
        
    except Exception as e:
        logger.error(f"Error saving onboarding data for user {user_id}: {e}")
        raise


async def complete_onboarding(db, user_id: str) -> Dict[str, Any]:
    """
    Mark onboarding as complete and trigger initialization of goals, weekly plans, and defaults
    Uses upsert pattern to handle users that don't exist in MongoDB yet
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        
    Returns:
        Dictionary with profile and dashboard initialization data
    """
    try:
        # Get user's onboarding profile (or create if not exists)
        user = await db.users.find_one({"clerk_user_id": user_id}, {"_id": 0})
        
        if not user:
            # Create user document if it doesn't exist
            await db.users.insert_one({
                "clerk_user_id": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "first_login": datetime.now(timezone.utc),  # First login is now
                "onboarding_profile": {}
            })
            logger.info(f"Created new user {user_id} during onboarding completion")
            user = {"onboarding_profile": {}}
        
        onboarding_profile = user.get("onboarding_profile", {})
        
        # Mark onboarding as completed and set first_login if not set
        completion_data = {
            "onboarding_profile.onboarding_completed": True,
            "onboarding_profile.onboarding_completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Set first_login if not already set
        if not user.get("first_login"):
            completion_data["first_login"] = datetime.now(timezone.utc)
        
        await db.users.update_one(
            {"clerk_user_id": user_id},
            {"$set": completion_data}
        )
        
        # Initialize goals based on onboarding data
        await initialize_goals(db, user_id, onboarding_profile)
        
        # Initialize weekly plan
        weekly_plan_data = await initialize_weekly_plan(db, user_id, onboarding_profile)
        
        # Configure commission defaults
        await configure_commission_defaults(db, user_id, onboarding_profile)
        
        # Initialize cap configuration if provided in onboarding
        await initialize_cap_from_onboarding(db, user_id, onboarding_profile)
        
        # Create dashboard starter data
        dashboard_data = {
            "weekly_plan": weekly_plan_data,
            "income_goal": onboarding_profile.get("income_goal", 0),
            "production_goal": onboarding_profile.get("homes_sold_goal", 0),
            "first_steps_checklist": generate_first_steps_checklist(onboarding_profile)
        }
        
        logger.info(f"Completed onboarding for user {user_id}")
        
        return {
            "profile": onboarding_profile,
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        logger.error(f"Error completing onboarding for user {user_id}: {e}")
        raise


async def initialize_goals(db, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Initialize user goals based on onboarding data
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        profile_data: Onboarding profile data
        
    Returns:
        Created goals data
    """
    try:
        income_goal = profile_data.get("income_goal", 0)
        homes_sold_goal = profile_data.get("homes_sold_goal", 0)
        
        # Check if goals already exist
        existing_goals = await db.goal_settings.find_one({"user_id": user_id})
        
        goals_data = {
            "user_id": user_id,
            "annual_gci_goal": income_goal,
            "annual_sales_goal": homes_sold_goal,
            "monthly_gci_goal": income_goal / 12 if income_goal else 0,
            "monthly_sales_goal": homes_sold_goal / 12 if homes_sold_goal else 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        if existing_goals:
            # Update existing goals
            await db.goal_settings.update_one(
                {"user_id": user_id},
                {"$set": goals_data}
            )
            logger.info(f"Updated goals for user {user_id}")
        else:
            # Create new goals
            await db.goal_settings.insert_one(goals_data)
            logger.info(f"Created goals for user {user_id}")
        
        return goals_data
        
    except Exception as e:
        logger.error(f"Error initializing goals for user {user_id}: {e}")
        raise


async def initialize_weekly_plan(db, user_id: str, profile_data: Dict[str, Any]) -> list:
    """
    Generate weekly plan based on onboarding preferences
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        profile_data: Onboarding profile data
        
    Returns:
        Weekly plan tasks list
    """
    try:
        weekly_hours = profile_data.get("weekly_hours", 20)
        weekly_focus = profile_data.get("weekly_focus", {})
        agent_type = profile_data.get("agent_type", "building_momentum")
        
        # Generate tasks based on weekly focus
        tasks = []
        
        if weekly_focus.get("lead_generation"):
            tasks.append({
                "task": "Lead Generation Activities",
                "hours": max(5, weekly_hours * 0.3),
                "description": "Focus on prospecting, networking, and generating new leads"
            })
        
        if weekly_focus.get("pipeline_growth"):
            tasks.append({
                "task": "Pipeline Development",
                "hours": max(5, weekly_hours * 0.3),
                "description": "Nurture existing leads and move deals forward"
            })
        
        if weekly_focus.get("consistency"):
            tasks.append({
                "task": "Daily Consistency Habits",
                "hours": max(3, weekly_hours * 0.2),
                "description": "Maintain daily routines and accountability systems"
            })
        
        # Add default tasks based on agent type
        if agent_type == "building_momentum":
            tasks.append({
                "task": "Skill Development",
                "hours": 3,
                "description": "Learn scripts, practice presentations, study market"
            })
        elif agent_type == "scaling_business":
            tasks.append({
                "task": "Business Systems",
                "hours": 5,
                "description": "Build systems, delegate tasks, optimize processes"
            })
        
        logger.info(f"Generated weekly plan for user {user_id}")
        return tasks
        
    except Exception as e:
        logger.error(f"Error initializing weekly plan for user {user_id}: {e}")
        raise


async def configure_commission_defaults(db, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Configure commission calculator defaults based on onboarding
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        profile_data: Onboarding profile data
        
    Returns:
        Commission configuration data
    """
    try:
        commission_settings = profile_data.get("commission", {})
        
        # Parse split (e.g., "70/30" -> 70)
        split_str = commission_settings.get("split", "70/30")
        agent_split = 70  # default
        
        if split_str and "/" in split_str:
            agent_split = int(split_str.split("/")[0])
        elif split_str == "custom":
            agent_split = 70  # default for custom
        
        commission_data = {
            "user_id": user_id,
            "default_split": agent_split,
            "has_team_fees": commission_settings.get("team_fees", False),
            "has_transaction_fees": commission_settings.get("transaction_fees", False),
            "auto_calculate_net": commission_settings.get("auto_net_calc", False),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Check if commission config already exists
        existing_config = await db.commission_defaults.find_one({"user_id": user_id})
        
        if existing_config:
            await db.commission_defaults.update_one(
                {"user_id": user_id},
                {"$set": commission_data}
            )
            logger.info(f"Updated commission defaults for user {user_id}")
        else:
            await db.commission_defaults.insert_one(commission_data)
            logger.info(f"Created commission defaults for user {user_id}")
        
        return commission_data
        
    except Exception as e:
        logger.error(f"Error configuring commission defaults for user {user_id}: {e}")
        raise


async def initialize_cap_from_onboarding(db, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Initialize commission cap configuration from onboarding data
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        profile_data: Onboarding profile data
        
    Returns:
        Cap configuration data or None if not configured
    """
    try:
        cap_settings = profile_data.get("commission_cap", {})
        
        # Only create cap config if user indicated they pay a cap
        if not cap_settings.get("has_cap", False):
            logger.info(f"User {user_id} does not pay a cap, skipping cap initialization")
            return None
        
        annual_cap = cap_settings.get("annual_cap_amount", 0)
        cap_percentage = cap_settings.get("cap_percentage", 0)
        reset_month = cap_settings.get("reset_month", 1)  # Default to January
        
        if annual_cap <= 0:
            logger.info(f"User {user_id} has no cap amount set, skipping cap initialization")
            return None
        
        # Calculate cap period dates
        now = datetime.now(timezone.utc)
        current_year = now.year
        
        # If reset month has passed this year, cap period starts this year
        # Otherwise, it started last year
        if now.month >= reset_month:
            cap_start = datetime(current_year, reset_month, 1, tzinfo=timezone.utc)
            cap_end = datetime(current_year + 1, reset_month, 1, tzinfo=timezone.utc)
        else:
            cap_start = datetime(current_year - 1, reset_month, 1, tzinfo=timezone.utc)
            cap_end = datetime(current_year, reset_month, 1, tzinfo=timezone.utc)
        
        cap_config = {
            "user_id": user_id,
            "annual_cap_amount": annual_cap,
            "cap_percentage": cap_percentage,
            "cap_period_type": "calendar_year",
            "cap_period_start": cap_start.isoformat(),
            "reset_date": cap_end.isoformat(),
            "current_cap_paid": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Use upsert to create or update cap configuration
        await db.cap_configurations.update_one(
            {"user_id": user_id},
            {"$set": cap_config},
            upsert=True
        )
        
        logger.info(f"Initialized cap configuration for user {user_id}: ${annual_cap} annual cap at {cap_percentage}%")
        return cap_config
        
    except Exception as e:
        logger.error(f"Error initializing cap for user {user_id}: {e}")
        # Don't raise - cap initialization is not critical
        return None



def generate_first_steps_checklist(profile_data: Dict[str, Any]) -> list:
    """
    Generate a first steps checklist based on onboarding profile
    
    Args:
        profile_data: Onboarding profile data
        
    Returns:
        List of first step items
    """
    checklist = [
        {
            "step": "Review your weekly plan",
            "completed": False,
            "description": "Check the AI-generated plan based on your goals"
        },
        {
            "step": "Add your first deal",
            "completed": False,
            "description": "Start tracking your pipeline in the P&L tracker"
        },
        {
            "step": "Log your daily activities",
            "completed": False,
            "description": "Begin tracking calls, appointments, and tasks"
        }
    ]
    
    # Add conditional steps based on profile
    weekly_focus = profile_data.get("weekly_focus", {})
    
    if weekly_focus.get("lead_generation"):
        checklist.append({
            "step": "Set up lead generation system",
            "completed": False,
            "description": "Define your prospecting strategy and schedule"
        })
    
    if profile_data.get("homes_sold_goal", 0) > 12:
        checklist.append({
            "step": "Plan your quarterly goals",
            "completed": False,
            "description": "Break down annual target into manageable quarterly milestones"
        })
    
    return checklist
