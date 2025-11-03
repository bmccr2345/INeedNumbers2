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
from app.security import enforce_body_limit, rate_limit
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
    
    # Additional rate limiting using security module
    rate_limit(user.id, settings.AI_COACH_RATE_LIMIT_PER_MIN)
    
    body = await request.json()
    stream = bool(body.get("stream", False))  # Default to non-stream for stability
    force = bool(body.get("force", False))
    year = int(body.get("year", datetime.datetime.utcnow().year))
    
    # Rate limiting
    allowed, retry_after = check_rate_limit(user.id, settings.AI_COACH_RATE_LIMIT_PER_MIN)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded", "retry_after": retry_after},
            headers={"Retry-After": str(retry_after)}
        )
    
    try:
        # Aggregate inputs
        goals, activity, reflections, pnl = await asyncio.gather(
            fetch_goal_settings(user.id),
            fetch_activity_log(user.id, 28),
            fetch_reflection_log(user.id, 2),  # Limit to 2 most recent
            fetch_pnl_summary(user.id, year)
        )
        
        # Redact PII from reflections
        for reflection in reflections:
            reflection['reflection'] = redact_pii(reflection['reflection'])
        
        payload = {
            "goals": goals,
            "activity": activity, 
            "reflections": reflections,
            "pnl": pnl,
            "user_plan": user.plan
        }
        
        # Check cache first
        cache_key = make_cache_key(user.id, payload)
        if not force:
            cached = get_cache(cache_key, settings.AI_CACHE_TTL_SECONDS)
            if cached:
                logger.info(f"Cache hit for user {user.id[:8]}...")
                return JSONResponse(content=json.loads(cached))
        
        # If no data, return deterministic response
        if not any([goals, activity.get('entries_count', 0) > 0, reflections, pnl.get('deals_count', 0) > 0]):
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
        
        messages = [
            {"role": "system", "content": coach_system_prompt()},
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
            
            # Try to parse as JSON
            try:
                obj = json.loads(text)
                # Validate required keys
                required_keys = ['summary', 'stats', 'actions', 'risks', 'next_inputs']
                if not all(key in obj for key in required_keys):
                    raise ValueError("Missing required keys")
            except (json.JSONDecodeError, ValueError):
                # Fallback to structured response
                obj = {
                    "summary": text.strip()[:200],
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