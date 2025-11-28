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
        
        # Update user profile with onboarding data
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise ValueError(f"User {user_id} not found")
        
        logger.info(f"Saved onboarding data for user {user_id}")
        return profile_data.dict()
        
    except Exception as e:
        logger.error(f"Error saving onboarding data for user {user_id}: {e}")
        raise


async def complete_onboarding(db, user_id: str) -> Dict[str, Any]:
    """
    Mark onboarding as complete and trigger initialization of goals, weekly plans, and defaults
    
    Args:
        db: MongoDB database connection
        user_id: User ID
        
    Returns:
        Dictionary with profile and dashboard initialization data
    """
    try:
        # Get user's onboarding profile
        user = await db.users.find_one({"clerk_user_id": user_id}, {"_id": 0})
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        onboarding_profile = user.get("onboarding_profile", {})
        if not onboarding_profile:
            raise ValueError("No onboarding profile found")
        
        # Mark onboarding as completed
        completion_data = {
            "onboarding_profile.onboarding_completed": True,
            "onboarding_profile.onboarding_completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": completion_data}
        )
        
        # Initialize goals based on onboarding data
        goals_data = await initialize_goals(db, user_id, onboarding_profile)
        
        # Initialize weekly plan
        weekly_plan_data = await initialize_weekly_plan(db, user_id, onboarding_profile)
        
        # Configure commission defaults
        commission_data = await configure_commission_defaults(db, user_id, onboarding_profile)
        
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
