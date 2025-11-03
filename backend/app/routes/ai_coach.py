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
from openai import AsyncOpenAI
import asyncio
import json
import datetime
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)

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
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
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
        else:
            system_prompt = coach_system_prompt()
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, indent=2)}
        ]
        
        # Log metadata (no raw content)
        logger.info(f"AI coach request - user: {user.id[:8]}..., model: {settings.OPENAI_MODEL}, "
                   f"max_tokens: {settings.AI_COACH_MAX_TOKENS}, has_goals: {bool(goals)}, "
                   f"activity_entries: {activity.get('entries_count', 0)}, reflections: {len(reflections)}")
        
        if stream:
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
            # Non-streaming path
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=settings.AI_COACH_TEMPERATURE,
                max_tokens=settings.AI_COACH_MAX_TOKENS
            )
            
            text = response.choices[0].message.content or ""
            
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
                
                # Cache successful response
                set_cache(cache_key, json.dumps(formatted_response))
                return JSONResponse(content=formatted_response)
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
                
                # Cache successful response
                set_cache(cache_key, json.dumps(analysis_response))
                return JSONResponse(content=analysis_response)
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
                    # Validate required keys (removed 'summary', added 'coaching_advice')
                    required_keys = ['coaching_advice', 'stats', 'actions', 'risks', 'next_inputs']
                    if not all(key in obj for key in required_keys):
                        raise ValueError("Missing required keys")
                            
                except (json.JSONDecodeError, ValueError):
                    # Fallback to structured response
                    obj = {
                        "coaching_advice": "Keep logging your daily activities and reviewing your numbers. Consistency is key to reaching your goals. Track your conversations, appointments, and deals to understand what's working. Your progress compounds over time when you stay focused on the fundamentals.",
                        "stats": {
                            "goals": goals,
                            "recent_activity": activity,
                            "pnl_summary": pnl
                        },
                        "actions": [],
                        "risks": [],
                        "next_inputs": [
                            "Log daily conversations and appointments", 
                            "Update goal progress weekly",
                            "Review P&L monthly"
                        ]
                    }
                
                # Cache successful response
                set_cache(cache_key, json.dumps(obj))
                return JSONResponse(content=obj)
            
    except Exception as e:
        logger.error(f"AI coach error for user {user.id[:8]}...: {e}")
        
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