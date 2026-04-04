from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
import sys
import os

# Add the parent directory to the path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.deps import get_settings
from app.clerk_auth import get_current_user_unified, require_plan_unified
from app.ai import make_cache_key, get_cache, set_cache, check_rate_limit
from app.data_views import fetch_goal_settings, fetch_activity_log, fetch_reflection_log, fetch_pnl_summary
from app.prompts import coach_system_prompt
from app.security import enforce_body_limit
from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError
import asyncio
import json
import datetime
from datetime import timezone
import logging
import re
from typing import Optional, Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)

# =============================================================================
# STAGE 1: AI Token Logging - Pricing Table & Non-blocking Logger
# =============================================================================
OPENAI_PRICING = {
    "gpt-4o-mini": {
        "input_per_1k": 0.00015,
        "output_per_1k": 0.0006
    }
}


def calculate_ai_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate estimated cost based on token usage and model pricing.
    Returns float rounded to 8 decimal places for consistent precision.
    Note: Using float (not Decimal) as MongoDB stores as BSON double.
    Rounding to 8 decimals avoids floating-point drift accumulation.
    """
    pricing = OPENAI_PRICING.get(model, OPENAI_PRICING["gpt-4o-mini"])
    input_cost = (prompt_tokens / 1000) * pricing["input_per_1k"]
    output_cost = (completion_tokens / 1000) * pricing["output_per_1k"]
    return round(input_cost + output_cost, 8)


def _handle_logging_task_result(task: asyncio.Task) -> None:
    """
    Callback to handle completed logging tasks.
    Prevents 'Task exception was never retrieved' warnings.
    """
    try:
        # Retrieve exception if any (this marks it as "retrieved")
        exc = task.exception()
        if exc:
            logger.error(f"AI usage logging task failed: {exc}")
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


async def log_ai_usage_background(
    user_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    estimated_cost: float
) -> None:
    """
    Non-blocking background task to log AI usage to MongoDB.
    Performs two operations:
      1. Insert detailed usage log to ai_usage_logs (Stage 1)
      2. Atomic $inc update to ai_usage_monthly (Stage 2)
    Failures are logged internally only - never affects user response.
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        now = datetime.datetime.now(timezone.utc)
        year_month = now.strftime("%Y-%m")
        
        # Round cost to 8 decimals for consistent precision before $inc
        # This prevents floating-point drift accumulation over many increments
        rounded_cost = round(estimated_cost, 8)
        
        # =================================================================
        # STAGE 1: Insert detailed usage log
        # =================================================================
        usage_doc = {
            "user_id": user_id,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "estimated_cost": rounded_cost,
            "timestamp": now
        }
        
        await db.ai_usage_logs.insert_one(usage_doc)
        logger.info(f"AI usage logged - user: {user_id[:8]}..., tokens: {total_tokens}, cost: ${rounded_cost:.6f}")
        
        # =================================================================
        # STAGE 2: Atomic monthly counter update
        # Uses $inc with upsert=True - NO read-modify-write pattern
        # Concurrency-safe: MongoDB guarantees atomicity of update_one
        # =================================================================
        await db.ai_usage_monthly.update_one(
            {"user_id": user_id, "year_month": year_month},
            {
                "$inc": {
                    "total_tokens": total_tokens,
                    "total_cost": rounded_cost,
                    "request_count": 1
                },
                "$setOnInsert": {
                    "user_id": user_id,
                    "year_month": year_month
                }
            },
            upsert=True
        )
        logger.info(f"AI usage monthly updated - user: {user_id[:8]}..., month: {year_month}")
        
    except Exception as e:
        # Log internally only - never fail user response
        logger.error(f"AI usage logging failed (non-blocking): {e}")
    finally:
        try:
            client.close()
        except Exception:
            pass


# =============================================================================
# STAGE 3: Soft Limit Mode (Observation Only)
# =============================================================================
async def get_user_monthly_usage(user_id: str) -> Dict[str, Any]:
    """
    Fetch current month's usage for a user from ai_usage_monthly.
    Lightweight read-only query - does not block or modify data.
    Returns empty dict if no usage found or on error.
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=3000)
        db = client[db_name]
        
        year_month = datetime.datetime.now(timezone.utc).strftime("%Y-%m")
        
        doc = await asyncio.wait_for(
            db.ai_usage_monthly.find_one(
                {"user_id": user_id, "year_month": year_month},
                {"_id": 0, "total_tokens": 1, "total_cost": 1, "request_count": 1}
            ),
            timeout=2.0  # 2 second timeout for lightweight check
        )
        
        client.close()
        
        if doc:
            return {
                "total_tokens": doc.get("total_tokens", 0),
                "total_cost": doc.get("total_cost", 0.0),
                "request_count": doc.get("request_count", 0),
                "year_month": year_month
            }
        return {"total_tokens": 0, "total_cost": 0.0, "request_count": 0, "year_month": year_month}
        
    except asyncio.TimeoutError:
        logger.warning(f"Usage check timed out for user {user_id[:8]}...")
        return {}
    except Exception as e:
        logger.warning(f"Usage check failed for user {user_id[:8]}...: {e}")
        return {}


def calculate_usage_status(
    current_usage: Dict[str, Any],
    token_limit: int,
    cost_limit: float
) -> Dict[str, Any]:
    """
    Calculate usage percentages and determine warning/exceeded status.
    
    Returns dict with:
    - usage_percentage_tokens: float (0-100+)
    - usage_percentage_cost: float (0-100+)
    - usage_warning: bool (True if >= 80%)
    - usage_exceeded: bool (True if >= 100%)
    """
    if not current_usage or token_limit <= 0 or cost_limit <= 0:
        return {}
    
    current_tokens = current_usage.get("total_tokens", 0)
    current_cost = current_usage.get("total_cost", 0.0)
    
    token_percentage = (current_tokens / token_limit) * 100 if token_limit > 0 else 0
    cost_percentage = (current_cost / cost_limit) * 100 if cost_limit > 0 else 0
    
    # Round to 2 decimal places for cleaner output
    token_percentage = round(token_percentage, 2)
    cost_percentage = round(cost_percentage, 2)
    
    # Determine thresholds
    max_percentage = max(token_percentage, cost_percentage)
    usage_warning = max_percentage >= 80
    usage_exceeded = max_percentage >= 100
    
    result = {
        "usage_percentage_tokens": token_percentage,
        "usage_percentage_cost": cost_percentage
    }
    
    if usage_warning:
        result["usage_warning"] = True
    
    if usage_exceeded:
        result["usage_exceeded"] = True
        logger.warning(
            f"AI usage exceeded soft limit - tokens: {token_percentage:.1f}%, cost: {cost_percentage:.1f}%"
        )
    
    return result


async def call_openai_with_retry(
    client: AsyncOpenAI,
    model: str,
    messages: list,
    temperature: float,
    max_tokens: int,
    max_retries: int = 1
) -> Any:
    """
    Call OpenAI API with single retry for transient errors.
    
    Retry logic:
    - Maximum 1 retry (2 attempts total)
    - Exponential backoff (1 second delay)
    - DO NOT retry 400-level client errors
    - DO NOT retry validation errors
    - Only retry 5xx server errors and rate limits
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response
            
        except RateLimitError as e:
            # Retry rate limit errors
            last_exception = e
            if attempt < max_retries:
                logger.warning(f"OpenAI rate limit hit, retrying in 1s (attempt {attempt + 1}/{max_retries + 1})")
                await asyncio.sleep(1.0)
            else:
                logger.error(f"OpenAI rate limit exceeded after {max_retries + 1} attempts")
                raise
                
        except APIConnectionError as e:
            # Retry connection errors
            last_exception = e
            if attempt < max_retries:
                logger.warning(f"OpenAI connection error, retrying in 1s (attempt {attempt + 1}/{max_retries + 1})")
                await asyncio.sleep(1.0)
            else:
                logger.error(f"OpenAI connection failed after {max_retries + 1} attempts")
                raise
                
        except APIError as e:
            # Check if it's a server error (5xx) or client error (4xx)
            status_code = getattr(e, 'status_code', 500)
            
            if status_code >= 500:
                # Retry server errors
                last_exception = e
                if attempt < max_retries:
                    logger.warning(f"OpenAI server error ({status_code}), retrying in 1s")
                    await asyncio.sleep(1.0)
                else:
                    logger.error(f"OpenAI server error after {max_retries + 1} attempts")
                    raise
            else:
                # DO NOT retry 4xx client errors - raise immediately
                logger.error(f"OpenAI client error ({status_code}): {e}")
                raise
                
        except Exception as e:
            # Unknown errors - do not retry
            logger.error(f"OpenAI unexpected error: {e}")
            raise
    
    # Should not reach here, but just in case
    if last_exception:
        raise last_exception


def merge_usage_status(response: Dict[str, Any], usage_status: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge usage_status fields into the AI response.
    Only adds fields if usage_status contains warning or exceeded flags.
    """
    if not usage_status:
        return response
    
    # Create a copy to avoid mutating the original
    result = dict(response)
    
    # Add usage fields if warning/exceeded thresholds met
    if usage_status.get("usage_warning") or usage_status.get("usage_exceeded"):
        if "usage_percentage_tokens" in usage_status:
            result["usage_percentage_tokens"] = usage_status["usage_percentage_tokens"]
        if "usage_percentage_cost" in usage_status:
            result["usage_percentage_cost"] = usage_status["usage_percentage_cost"]
        if usage_status.get("usage_warning"):
            result["usage_warning"] = True
        if usage_status.get("usage_exceeded"):
            result["usage_exceeded"] = True
    
    return result

def redact_pii(text: str) -> str:
    """Basic PII scrubbing for reflections"""
    if not text:
        return text
    
    # Replace email patterns
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    # Replace phone patterns
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    # Replace SSN patterns
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
    
    return text

def format_pnl_analysis(obj: dict) -> str:
    """
    Format P&L analysis JSON into readable text for frontend display
    """
    try:
        logger.info(f"format_pnl_analysis called with object: {obj}")
        formatted_text = ""
        
        # Add summary
        if obj.get("summary"):
            formatted_text += obj["summary"] + "\n\n"
            logger.info(f"Added summary: {obj['summary']}")
        
        # Add stats if available (this was missing!)
        stats = obj.get("stats")
        if stats:
            if isinstance(stats, list):
                formatted_text += "**Key Financial Metrics:**\n"
                for i, stat in enumerate(stats, 1):
                    formatted_text += f"{i}. {stat}\n"
                formatted_text += "\n"
            elif isinstance(stats, str):
                formatted_text += f"**Key Financial Metrics:**\n{stats}\n\n"
        
        # Add actions if available
        actions = obj.get("actions", [])
        if actions and isinstance(actions, list):
            formatted_text += "**Recommended Actions:**\n"
            for i, action in enumerate(actions, 1):
                formatted_text += f"{i}. {action}\n"
            formatted_text += "\n"
        
        # Add risks if available  
        risks = obj.get("risks", [])
        if risks and isinstance(risks, list):
            formatted_text += "**Risk Factors:**\n"
            for i, risk in enumerate(risks, 1):
                formatted_text += f"{i}. {risk}\n"
            formatted_text += "\n"
        
        # Add next inputs if available
        next_inputs = obj.get("next_inputs", [])
        if next_inputs and isinstance(next_inputs, list):
            formatted_text += "**Next Steps:**\n"
            for i, input_item in enumerate(next_inputs, 1):
                formatted_text += f"{i}. {input_item}\n"
        
        # If we have no formatted text, it means the JSON structure was unexpected
        if not formatted_text.strip():
            logger.warning(f"No formatted text generated from object: {obj}")
            return f"Analysis completed. Raw data: {str(obj)[:500]}..."
        
        logger.info(f"Final formatted text length: {len(formatted_text)}")
        return formatted_text.strip()
        
    except Exception as e:
        logger.error(f"Error formatting P&L analysis: {e}")
        return obj.get("summary", "Analysis completed but formatting failed.")

@router.post("/generate")
async def generate_coach(
    request: Request, 
    user = Depends(require_plan_unified("starter")),
    settings = Depends(get_settings)
):
    """Generate AI coaching insights with streaming support"""
    
    logger.info(f"AI Coach request started - user_id: {user.id[:8]}..., plan: {user.plan}")
    
    if not settings.AI_COACH_ENABLED:
        raise HTTPException(status_code=503, detail="AI Coach disabled")
    
    # Enforce body size limit
    enforce_body_limit(request, settings.MAX_JSON_BODY_KB)
    
    # Apply rate limiting for AI Coach endpoint using MongoDB
    from app.mongodb_cache import rate_limit_check
    from datetime import timezone
    rate_result = await rate_limit_check(
        f"ai_coach:{user.id}",
        5,  # 5 requests per minute for AI Coach
        60  # 60 seconds window
    )
    
    if not rate_result["allowed"]:
        retry_after = int((rate_result["reset_time"] - datetime.datetime.now(timezone.utc)).total_seconds())
        raise HTTPException(
            status_code=429,
            detail="AI Coach rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(retry_after)}
        )
    
    # =================================================================
    # STAGE 3: Soft Limit Check (Observation Only - Does NOT block)
    # =================================================================
    usage_status = {}
    try:
        token_limit = settings.AI_MONTHLY_TOKEN_LIMIT
        cost_limit = settings.AI_MONTHLY_COST_LIMIT
        
        if token_limit > 0 and cost_limit > 0:
            current_usage = await get_user_monthly_usage(user.id)
            if current_usage:
                usage_status = calculate_usage_status(current_usage, token_limit, cost_limit)
                
                # Log for observability but DO NOT block
                if usage_status.get("usage_exceeded"):
                    logger.warning(
                        f"User {user.id[:8]}... exceeded soft limits: "
                        f"tokens={usage_status.get('usage_percentage_tokens', 0):.1f}%, "
                        f"cost={usage_status.get('usage_percentage_cost', 0):.1f}%"
                    )
    except Exception as e:
        # Never let limit check failure affect AI response
        logger.warning(f"Soft limit check failed (non-blocking): {e}")
    
    body = await request.json()
    stream = bool(body.get("stream", False))  # Default to non-stream for stability
    force = bool(body.get("force", False))
    year = int(body.get("year", datetime.datetime.utcnow().year))
    context = body.get("context", "general")  # New: Check for specific context
    
    try:
        # For affordability analysis, we don't need dashboard data
        if context == "affordability_analysis":
            goals, activity, reflections, pnl = [], {"entries_count": 0}, [], {"deals_count": 0}
        else:
            # Aggregate inputs for dashboard/P&L contexts
            goals, activity, reflections, pnl = await asyncio.gather(
                fetch_goal_settings(user.id),
                fetch_activity_log(user.id, 28),
                fetch_reflection_log(user.id, 2),  # Limit to 2 most recent
                fetch_pnl_summary(user.id, year)
            )
            
            # Redact PII from reflections
            for reflection in reflections:
                reflection['reflection'] = redact_pii(reflection['reflection'])
        
        # Handle P&L Analysis Context
        if context == "pnl_analysis":
            # Get P&L specific data from request body
            pnl_data = body.get("pnl_data", {})
            
            payload = {
                "analysis_type": "pnl_financial_analysis",
                "current_month": pnl_data.get("current_month", {}),
                "historical_data": pnl_data.get("historical_data", []),
                "analysis_focus": pnl_data.get("analysis_focus", []),
                "user_plan": user.plan,
                "context": "P&L analysis with 6-month historical trends and cost optimization focus"
            }
        elif context == "affordability_analysis":
            # Get affordability specific data from request body
            affordability_data = body.get("affordability_data", {})
            
            payload = {
                "analysis_type": "home_affordability_analysis",
                "home_price": affordability_data.get("home_price", 0),
                "monthly_income": affordability_data.get("monthly_income", 0),
                "down_payment": affordability_data.get("down_payment", 0),
                "interest_rate": affordability_data.get("interest_rate", 0),
                "dti_ratio": affordability_data.get("dti_ratio", 0),
                "qualified": affordability_data.get("qualified", False),
                "loan_type": affordability_data.get("loan_type", ""),
                "monthly_payment": affordability_data.get("monthly_payment", 0),
                "property_taxes": affordability_data.get("property_taxes", 0),
                "insurance": affordability_data.get("insurance", 0),
                "pmi": affordability_data.get("pmi", 0),
                "user_plan": user.plan,
                "context": "Home affordability analysis focusing on qualification status, DTI, and monthly payment affordability"
            }
        elif context == "net_sheet_analysis":
            # Get seller net sheet specific data from request body
            deal_data = body.get("deal_data", {})
            
            payload = {
                "analysis_type": "seller_net_sheet_analysis",
                "sale_price": deal_data.get("sale_price", 0),
                "commission": deal_data.get("commission", 0),
                "net_amount": deal_data.get("net_amount", 0),
                "net_percentage": deal_data.get("net_percentage", 0),
                "deal_state": deal_data.get("deal_state", ""),
                "inputs": deal_data.get("inputs", {}),
                "results": deal_data.get("results", {}),
                "user_plan": user.plan,
                "context": "Seller net sheet analysis focusing on net proceeds, cost optimization, and deal structure"
            }
        elif context == "investor_deal_analysis" or context == "custom_investor_analysis":
            # INVESTOR DEAL ANALYSIS - Custom prompt for real estate investment analysis
            custom_prompt = body.get("custom_prompt", "")
            deal_data = body.get("deal_data", {})
            
            if custom_prompt:
                # Use the custom prompt directly from frontend
                pass
        elif context == "action_coaching":
            # ACTION COACHING - What should I do right now?
            tracker_settings = body.get("tracker_settings", {}) or {}
            daily_tracker = body.get("daily_tracker", {}) or {}
            pnl_data = body.get("pnl_data", {}) or {}
            recent_activity_logs = body.get("recent_activity_logs", []) or []
            goal_settings_data = body.get("goal_settings", {}) or {}

            # Extract relevant data points
            monthly_goal = tracker_settings.get("monthlyClosingsTarget", "not set")
            income_goal = goal_settings_data.get("annual_gci_goal", "not set")
            
            # Get completed activities
            completed_today = daily_tracker.get("completed", {}) if isinstance(daily_tracker, dict) else {}
            activities_completed = sum(completed_today.values()) if isinstance(completed_today, dict) else 0
            
            # Get income data
            current_income = pnl_data.get("total_income", 0) if isinstance(pnl_data, dict) else 0
            current_expenses = pnl_data.get("total_expenses", 0) if isinstance(pnl_data, dict) else 0

            # Format recent actions
            recent_actions_text = "None recorded"
            if recent_activity_logs and isinstance(recent_activity_logs, list):
                recent_items = recent_activity_logs[:5]
                recent_actions_text = "; ".join([
                    f"{log.get('activity', 'unknown')} ({log.get('date', 'unknown date')[:10] if log.get('date') else 'unknown'})"
                    for log in recent_items if isinstance(log, dict)
                ])

            pipeline_summary = f"Monthly closing goal: {monthly_goal}. Current month income: ${current_income:,.0f}, expenses: ${current_expenses:,.0f}."
            today_activity = f"{activities_completed} activities completed today."

            action_coaching_prompt = f"""You are an elite real estate performance coach focused on maximizing income through daily actions.

Your job is to decide what this agent should do RIGHT NOW to move closer to a closing.

---

CONTEXT:
- Monthly closing goal: {monthly_goal}
- Annual income goal: {income_goal}
- Current pipeline summary: {pipeline_summary}
- Activities completed today: {today_activity}
- Recent actions taken: {recent_actions_text}

---

STEP 1: DIAGNOSE
Identify the single biggest constraint. Choose one:
- Not enough new leads
- Weak follow-up
- Deals not converting
- Pipeline too thin for future income
- Low activity / inconsistency

---

STEP 2: PRIORITIZE
Based on the constraint, choose ONE focus area:
- Prospecting (new leads)
- Follow-up (revive opportunities)
- Conversion (close deals)
- Visibility (marketing that leads to conversations)

Do NOT repeat the same focus as the most recent actions suggest.

---

STEP 3: GENERATE ACTIONS
Generate exactly 3 actions.

Rules:
- Each action must be specific and executable within 30-60 minutes
- Must reference real context when possible (their goal numbers, activity gaps, etc.)
- Must directly impact income (not busy work)
- Avoid generic advice like "follow up with leads" — be specific about WHO and HOW

---

STEP 4: ADD VARIATION
Each time this runs:
- Change communication channel (call, text, video, social, email)
- Change audience (past client, warm lead, new contact, local audience)
- Change tone (direct, casual, value-based, urgency)

Avoid repeating these recent actions:
{recent_actions_text}

---

OUTPUT FORMAT (follow this EXACTLY):

If you do these 3 things today, you increase your chance of a closing this month by [estimate]%.

Constraint:
[1 sentence identifying the biggest gap]

Focus:
[Chosen area - one of: Prospecting, Follow-up, Conversion, Visibility]

---

1. Action:
[Specific action title]

   How to do it:
[Exact steps, wording, or script to use]

   Why this matters:
[1 sentence tied to closing or income]

---

2. Action:
[Specific action title]

   How to do it:
[Exact steps, wording, or script to use]

   Why this matters:
[1 sentence tied to closing or income]

---

3. Action:
[Specific action title]

   How to do it:
[Exact steps, wording, or script to use]

   Why this matters:
[1 sentence tied to closing or income]"""

            payload = {
                "analysis_type": "action_coaching",
                "tracker_settings": tracker_settings,
                "daily_tracker": daily_tracker,
                "pnl_data": pnl_data,
                "recent_activity_logs": recent_activity_logs,
                "goal_settings": goal_settings_data,
                "user_plan": user.plan,
                "context": "Action coaching for real estate agent performance"
            }
                payload = {
                    "analysis_type": "investor_deal_analysis",
                    "custom_prompt": custom_prompt,
                    "user_plan": user.plan,
                    "context": "Custom investor deal analysis with industry benchmarks"
                }
            else:
                # Build default investor analysis payload
                payload = {
                    "analysis_type": "investor_deal_analysis",
                    "purchase_price": deal_data.get("purchase_price", 0),
                    "monthly_rent": deal_data.get("monthly_rent", 0),
                    "cap_rate": deal_data.get("cap_rate", 0),
                    "cash_on_cash": deal_data.get("cash_on_cash_return", 0),
                    "noi": deal_data.get("noi", 0),
                    "cash_flow": deal_data.get("annual_cash_flow", 0),
                    "expenses": deal_data.get("operating_expenses", 0),
                    "user_plan": user.plan,
                    "context": "Investment property analysis with industry benchmarks and recommendations"
                }
        else:
            # Standard dashboard AI Coach payload
            payload = {
                "goals": goals,
                "activity": activity, 
                "reflections": reflections,
                "pnl": pnl,
                "user_plan": user.plan
            }
        
        # Check cache first (but use different cache keys for different contexts)
        cache_key = make_cache_key(user.id, payload, context)
        if not force:
            cached = get_cache(cache_key, settings.AI_CACHE_TTL_SECONDS)
            if cached:
                logger.info(f"Cache hit for user {user.id[:8]}... context: {context}")
                return JSONResponse(content=json.loads(cached))
        
        # If no data, return deterministic response
        if context == "pnl_analysis":
            # For P&L analysis, we can still provide insights even with limited data
            pnl_data = body.get("pnl_data", {})
            current_month = pnl_data.get("current_month", {})
            
            if current_month.get("total_income", 0) == 0 and current_month.get("total_expenses", 0) == 0:
                fallback_response = {
                    "summary": "I don't see any P&L data to analyze yet. Start by adding your income from closed deals and business expenses to get detailed financial insights and cost reduction recommendations.",
                    "stats": {},
                    "actions": [
                        "Add commission income from closed deals",
                        "Log business expenses by category", 
                        "Track expenses for at least one full month"
                    ],
                    "risks": ["Missing financial tracking limits business growth insights"],
                    "next_inputs": [
                        "Commission income from recent closings",
                        "Monthly business expenses (marketing, leads, office, etc.)",
                        "Historical data for trend analysis"
                    ]
                }
                return JSONResponse(content=fallback_response)
        elif context == "affordability_analysis":
            # For affordability analysis, we need the basic affordability data
            affordability_data = body.get("affordability_data", {})
            
            if not affordability_data.get("home_price") or not affordability_data.get("monthly_income"):
                fallback_response = {
                    "summary": "I need home price and monthly income data to provide affordability analysis. Please provide the basic home purchase details for personalized affordability insights.",
                    "stats": {},
                    "actions": [
                        "Enter the home purchase price",
                        "Provide your gross monthly income",
                        "Add down payment amount and interest rate"
                    ],
                    "risks": ["Incomplete data prevents accurate affordability assessment"],
                    "next_inputs": [
                        "Home purchase price",
                        "Gross monthly income",
                        "Down payment amount and loan details"
                    ]
                }
                return JSONResponse(content=fallback_response)
        elif not any([goals, activity.get('entries_count', 0) > 0, reflections, pnl.get('deals_count', 0) > 0]):
            fallback_response = {
                "summary": "Set up your goals and start logging activities to get personalized coaching insights.",
                "stats": {},
                "actions": [],
                "risks": [],
                "next_inputs": [
                    "Set your annual GCI goal in Goal Settings",
                    "Log daily conversations and appointments",
                    "Add your deals to P&L tracker"
                ]
            }
            return JSONResponse(content=fallback_response)
        
        # Call OpenAI
        logger.info(f"Preparing to call OpenAI for user {user.id[:8]}...")
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info(f"OpenAI client created successfully for user {user.id[:8]}...")
        
        # Use appropriate system prompt based on context
        if context == "pnl_analysis":
            from app.prompts import pnl_analysis_system_prompt
            system_prompt = pnl_analysis_system_prompt()
        elif context == "affordability_analysis":
            from app.prompts import affordability_analysis_system_prompt
            system_prompt = affordability_analysis_system_prompt()
        elif context == "net_sheet_analysis":
            from app.prompts import net_sheet_analysis_system_prompt
            system_prompt = net_sheet_analysis_system_prompt()
        elif context in ("investor_deal_analysis", "custom_investor_analysis"):
            # For investor analysis, use the custom prompt if provided
            custom_prompt = body.get("custom_prompt", "")
            if custom_prompt:
                # Custom prompt IS the user message - no system prompt needed
                system_prompt = "You are an expert real estate investment analyst. Provide clear, professional analysis."
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": custom_prompt}
                ]
            else:
                from app.prompts import investor_analysis_system_prompt
                try:
                    system_prompt = investor_analysis_system_prompt()
                except ImportError:
                    # Fallback if prompt not defined
                    system_prompt = "You are an expert real estate investment analyst. Analyze the investment property data and provide insights comparing metrics to industry standards."
        elif context == "action_coaching":
            # Use the action coaching prompt we already built
            system_prompt = action_coaching_prompt
        else:
            system_prompt = coach_system_prompt()
        
        # Only build messages here if not already built for investor analysis
        if context not in ("investor_deal_analysis", "custom_investor_analysis") or not body.get("custom_prompt"):
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload, indent=2)}
            ]
        
        # Log metadata (no raw content)
        logger.info(f"AI coach request - user: {user.id[:8]}..., model: {settings.OPENAI_MODEL}, "
                   f"max_tokens: {settings.AI_COACH_MAX_TOKENS}, has_goals: {bool(goals)}, "
                   f"activity_entries: {activity.get('entries_count', 0)}, reflections: {len(reflections)}")
        
        if stream:
            # TODO: Implement token capture for streaming responses when OpenAI usage
            # metadata becomes available. Currently, streaming responses do not return
            # usage statistics in the response chunks. See: https://platform.openai.com/docs/api-reference/streaming
            async def token_generator():
                try:
                    response = await client.chat.completions.create(
                        model=settings.OPENAI_MODEL,
                        messages=messages,
                        temperature=settings.AI_COACH_TEMPERATURE,
                        max_tokens=settings.AI_COACH_MAX_TOKENS,
                        stream=True
                    )
                    
                    collected = ""
                    async for chunk in response:
                        delta = chunk.choices[0].delta.content or ""
                        collected += delta
                        yield f"data: {json.dumps({'delta': delta})}\n\n"
                    
                    # Try to parse final JSON and cache if valid
                    try:
                        final_obj = json.loads(collected)
                        set_cache(cache_key, collected)
                        yield f"data: {json.dumps({'done': True})}\n\n"
                    except json.JSONDecodeError:
                        # If not valid JSON, wrap in expected format
                        fallback = {
                            "summary": collected[:200] + "..." if len(collected) > 200 else collected,
                            "stats": payload,
                            "actions": [],
                            "risks": [],
                            "next_inputs": ["Continue logging activities", "Review and update goals"]
                        }
                        set_cache(cache_key, json.dumps(fallback))
                        yield f"data: {json.dumps({'fallback': fallback})}\n\n"
                        
                except Exception as e:
                    logger.error(f"Stream error for user {user.id[:8]}...: {e}")
                    yield f"data: {json.dumps({'error': 'Stream failed, try non-stream mode'})}\n\n"
            
            return StreamingResponse(
                token_generator(),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache"}
            )
        
        else:
            # Non-streaming path with STAGE 3 retry logic
            logger.info(f"Making non-streaming OpenAI API call for user {user.id[:8]}...")
            response = await call_openai_with_retry(
                client=client,
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=settings.AI_COACH_TEMPERATURE,
                max_tokens=settings.AI_COACH_MAX_TOKENS,
                max_retries=1
            )
            logger.info(f"OpenAI API call successful for user {user.id[:8]}...")
            
            # STAGE 1: Fire non-blocking background task for AI usage logging
            # This runs completely independently - user response is returned immediately
            try:
                usage = getattr(response, 'usage', None)
                if usage and hasattr(usage, 'prompt_tokens') and hasattr(usage, 'completion_tokens'):
                    prompt_tokens = usage.prompt_tokens or 0
                    completion_tokens = usage.completion_tokens or 0
                    total_tokens = getattr(usage, 'total_tokens', None) or (prompt_tokens + completion_tokens)
                    
                    if prompt_tokens > 0 or completion_tokens > 0:
                        estimated_cost = calculate_ai_cost(
                            settings.OPENAI_MODEL,
                            prompt_tokens,
                            completion_tokens
                        )
                        task = asyncio.create_task(log_ai_usage_background(
                            user_id=user.id,
                            model=settings.OPENAI_MODEL,
                            prompt_tokens=prompt_tokens,
                            completion_tokens=completion_tokens,
                            total_tokens=total_tokens,
                            estimated_cost=estimated_cost
                        ))
                        # Add exception callback to prevent "Task exception was never retrieved"
                        task.add_done_callback(_handle_logging_task_result)
            except Exception as e:
                # Never let logging setup affect user response
                logger.warning(f"AI usage logging setup skipped: {e}")
            
            text = response.choices[0].message.content or ""
            logger.info(f"Received {len(text)} characters from OpenAI for user {user.id[:8]}...")
            
            # For P&L analysis and affordability analysis, format the response differently
            if context == "pnl_analysis":
                logger.info(f"P&L Analysis - Raw AI response: {text[:500]}...")  # Log first 500 chars
                
                # Strip markdown code block syntax if present
                clean_text = text.strip()
                if clean_text.startswith("```json"):
                    # Remove the opening ```json
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    # Remove the closing ```
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()
                
                logger.info(f"P&L Analysis - Cleaned text: {clean_text[:200]}...")
                
                # Try to parse as JSON first
                try:
                    obj = json.loads(clean_text)
                    logger.info(f"P&L Analysis - Parsed JSON keys: {list(obj.keys())}")
                    formatted_text = format_pnl_analysis(obj)
                    logger.info(f"P&L Analysis - Formatted text length: {len(formatted_text)}")
                    logger.info(f"P&L Analysis - Formatted text preview: {formatted_text[:200]}...")
                    
                    # Extract and format the content for better display
                    formatted_response = {
                        "summary": obj.get("summary", "Analysis completed"),
                        "formatted_analysis": formatted_text,
                        "raw_data": obj  # Keep raw data for debugging
                    }
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"P&L Analysis - JSON parsing failed after cleaning: {e}")
                    logger.info(f"P&L Analysis - Treating as plain text: {clean_text[:200]}...")
                    # If JSON parsing fails, treat as plain text
                    formatted_response = {
                        "summary": clean_text.strip()[:300],
                        "formatted_analysis": clean_text.strip(),
                        "raw_data": None
                    }
                
                # Cache successful response (without usage status - that's per-request)
                set_cache(cache_key, json.dumps(formatted_response))
                # STAGE 3: Add usage status to response
                return JSONResponse(content=merge_usage_status(formatted_response, usage_status))
            elif context == "affordability_analysis" or context == "net_sheet_analysis":
                analysis_type = "Affordability" if context == "affordability_analysis" else "Net Sheet"
                logger.info(f"{analysis_type} Analysis - Raw AI response: {text[:500]}...")  # Log first 500 chars
                
                # Strip markdown code block syntax if present
                clean_text = text.strip()
                if clean_text.startswith("```json"):
                    # Remove the opening ```json
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    # Remove the closing ```
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()
                
                logger.info(f"{analysis_type} Analysis - Cleaned text: {clean_text[:200]}...")
                
                # Try to parse as JSON first
                try:
                    obj = json.loads(clean_text)
                    logger.info(f"{analysis_type} Analysis - Parsed JSON keys: {list(obj.keys())}")
                    
                    # Validate required keys
                    required_keys = ['summary', 'stats', 'actions', 'risks', 'next_inputs']
                    if not all(key in obj for key in required_keys):
                        logger.warning(f"{analysis_type} Analysis - Missing required keys: {[k for k in required_keys if k not in obj]}")
                    
                    # Return the parsed JSON directly
                    analysis_response = {
                        "summary": obj.get("summary", f"{analysis_type} analysis completed"),
                        "stats": obj.get("stats", {}),
                        "actions": obj.get("actions", []),
                        "risks": obj.get("risks", []),
                        "next_inputs": obj.get("next_inputs", [])
                    }
                    
                    logger.info(f"{analysis_type} Analysis - Response summary: {analysis_response['summary'][:100]}...")
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"{analysis_type} Analysis - JSON parsing failed after cleaning: {e}")
                    logger.info(f"{analysis_type} Analysis - Treating as plain text: {clean_text[:200]}...")
                    # If JSON parsing fails, create structured response
                    analysis_response = {
                        "summary": clean_text.strip()[:300] if clean_text.strip() else f"{analysis_type} analysis completed",
                        "stats": {},
                        "actions": ["Review details", "Consider optimization opportunities"],
                        "risks": ["Incomplete assessment"],
                        "next_inputs": ["Additional data needed for comprehensive analysis"]
                    }
                
                # Cache successful response (without usage status - that's per-request)
                set_cache(cache_key, json.dumps(analysis_response))
                # STAGE 3: Add usage status to response
                return JSONResponse(content=merge_usage_status(analysis_response, usage_status))
            elif context in ("investor_deal_analysis", "custom_investor_analysis"):
                # INVESTOR ANALYSIS - Response is plain text, not JSON
                # Return it directly as a text response
                logger.info(f"Investor Analysis - Raw AI response: {text[:500]}...")

                investor_response = {
                    "response": text.strip(),
                    "context": context
                }

                set_cache(cache_key, json.dumps(investor_response))
                return JSONResponse(content=merge_usage_status(investor_response, usage_status))
            else:
                # Standard AI Coach processing
                # Strip markdown code block syntax if present
                clean_text = text.strip()
                if clean_text.startswith("```json"):
                    # Remove the opening ```json
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    # Remove the closing ```
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()
                
                try:
                    obj = json.loads(clean_text)
                    # Validate required keys for dashboard AI Coach
                    required_keys = ['summary', 'priority_actions', 'time_sensitive', 'performance_analysis']
                    if not all(key in obj for key in required_keys):
                        raise ValueError("Missing required keys")
                            
                except (json.JSONDecodeError, ValueError):
                    # Fallback to structured response
                    obj = {
                        "summary": "Keep logging your daily activities and reviewing your numbers. Consistency is key to reaching your goals. Track your conversations, appointments, and deals to understand what's working. Your progress compounds over time when you stay focused on the fundamentals.",
                        "priority_actions": [
                            "Log daily conversations and appointments",
                            "Update goal progress weekly",
                            "Review P&L monthly"
                        ],
                        "time_sensitive": [
                            "Set up your annual GCI goal if not done",
                            "Log today's business activities"
                        ],
                        "performance_analysis": "Start tracking your activities to see performance trends"
                    }
                
                # Cache successful response (without usage status - that's per-request)
                set_cache(cache_key, json.dumps(obj))
                # STAGE 3: Add usage status to response
                return JSONResponse(content=merge_usage_status(obj, usage_status))
            
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"AI coach error for user {user.id[:8]}...: {e}")
        logger.error(f"Full traceback: {error_traceback}")
        
        # Return safe fallback
        fallback_response = {
            "summary": "AI Coach temporarily unavailable. Your data is safe - try again in a few minutes.",
            "stats": {},
            "actions": [],
            "risks": ["AI Coach service interrupted"],
            "next_inputs": [
                "Continue logging daily activities",
                "Keep tracking deals in P&L", 
                "Try refreshing AI Coach in 5 minutes"
            ]
        }
        return JSONResponse(content=fallback_response)


@router.get("/diag")
async def coach_diagnostics(user = Depends(get_current_user_unified)):
    """Debug endpoint to show what data the coach sees"""
    try:
        goals, activity, reflections, pnl = await asyncio.gather(
            fetch_goal_settings(user.id),
            fetch_activity_log(user.id, 28),
            fetch_reflection_log(user.id, 2),
            fetch_pnl_summary(user.id, datetime.datetime.utcnow().year)
        )
        
        return {
            "user_id_prefix": user.id[:8] + "...",
            "user_plan": user.plan,
            "goals_count": len(goals),
            "activity_entries": activity.get('entries_count', 0),
            "reflections_count": len(reflections),
            "pnl_deals": pnl.get('deals_count', 0),
            "data_summary": {
                "has_goals": bool(goals),
                "has_recent_activity": activity.get('entries_count', 0) > 0,
                "has_reflections": len(reflections) > 0,
                "has_pnl_data": pnl.get('deals_count', 0) > 0
            }
        }
    except Exception as e:
        return {"error": str(e)}