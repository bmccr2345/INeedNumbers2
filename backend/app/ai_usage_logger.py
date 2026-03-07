"""
AI Usage Logger - Non-blocking token usage tracking

This module provides fire-and-forget logging of AI usage metadata.
It does NOT log prompts, user data, or PII - only token counts and costs.

Usage is captured asynchronously to avoid impacting response latency.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Static pricing table (per 1M tokens) - Updated March 2025
# Source: OpenAI pricing page
MODEL_PRICING = {
    "gpt-4o-mini": {
        "input": 0.15,   # $0.15 per 1M input tokens
        "output": 0.60,  # $0.60 per 1M output tokens
    },
    "gpt-4o": {
        "input": 2.50,   # $2.50 per 1M input tokens
        "output": 10.00, # $10.00 per 1M output tokens
    },
    "gpt-4-turbo": {
        "input": 10.00,
        "output": 30.00,
    },
    "gpt-3.5-turbo": {
        "input": 0.50,
        "output": 1.50,
    },
}

# Default pricing for unknown models
DEFAULT_PRICING = {
    "input": 1.00,
    "output": 3.00,
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate estimated cost based on model and token counts.
    Returns cost in USD.
    """
    pricing = MODEL_PRICING.get(model, DEFAULT_PRICING)
    
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    
    return round(input_cost + output_cost, 6)


class AIUsageLogger:
    """
    Non-blocking AI usage logger that captures token metadata.
    
    All logging operations are fire-and-forget to avoid impacting
    API response latency.
    """
    
    _instance: Optional['AIUsageLogger'] = None
    _db: Optional[AsyncIOMotorDatabase] = None
    _initialized: bool = False
    
    @classmethod
    async def initialize(cls, db: AsyncIOMotorDatabase) -> 'AIUsageLogger':
        """
        Initialize the logger with database connection.
        Creates indexes if they don't exist.
        """
        if cls._instance is None:
            cls._instance = cls()
        
        cls._db = db
        
        if not cls._initialized:
            try:
                # Create indexes for ai_usage_logs collection
                collection = db.ai_usage_logs
                
                # Index on user_id for user-specific queries
                await collection.create_index("user_id")
                
                # Index on timestamp for time-based queries
                await collection.create_index("timestamp")
                
                # Compound index for user + time range queries
                await collection.create_index([
                    ("user_id", 1),
                    ("timestamp", -1)
                ])
                
                # TTL index to auto-delete logs after 90 days (optional, for data hygiene)
                await collection.create_index(
                    "timestamp",
                    expireAfterSeconds=90 * 24 * 60 * 60,
                    name="ttl_90_days"
                )
                
                cls._initialized = True
                logger.info("AI Usage Logger initialized with indexes")
                
            except Exception as e:
                logger.error(f"Failed to initialize AI Usage Logger indexes: {e}")
                # Don't fail - logging should be best-effort
        
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> Optional['AIUsageLogger']:
        """Get the singleton instance."""
        return cls._instance
    
    async def log_usage(
        self,
        user_id: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        context: str = "general",
        request_id: Optional[str] = None
    ) -> None:
        """
        Log AI usage asynchronously (fire-and-forget).
        
        This method schedules the logging operation and returns immediately.
        It does NOT block the calling code.
        """
        # Schedule the actual logging as a background task
        asyncio.create_task(
            self._log_usage_internal(
                user_id=user_id,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                context=context,
                request_id=request_id
            )
        )
    
    async def _log_usage_internal(
        self,
        user_id: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        context: str,
        request_id: Optional[str]
    ) -> None:
        """
        Internal method that performs the actual database write.
        Runs as a background task.
        """
        if self._db is None:
            logger.warning("AI Usage Logger not initialized - skipping log")
            return
        
        try:
            total_tokens = prompt_tokens + completion_tokens
            estimated_cost = calculate_cost(model, prompt_tokens, completion_tokens)
            
            log_entry = {
                "user_id": user_id,
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "estimated_cost": estimated_cost,
                "context": context,
                "timestamp": datetime.now(timezone.utc),
            }
            
            if request_id:
                log_entry["request_id"] = request_id
            
            await self._db.ai_usage_logs.insert_one(log_entry)
            
            logger.debug(
                f"AI usage logged: user={user_id[:8]}..., "
                f"model={model}, tokens={total_tokens}, cost=${estimated_cost:.6f}"
            )
            
        except Exception as e:
            # Log error but do NOT propagate - this is fire-and-forget
            logger.error(f"Failed to log AI usage: {e}")


# Convenience function for easy access
async def log_ai_usage(
    user_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    context: str = "general",
    request_id: Optional[str] = None
) -> None:
    """
    Convenience function to log AI usage.
    Non-blocking - returns immediately.
    """
    instance = AIUsageLogger.get_instance()
    if instance:
        await instance.log_usage(
            user_id=user_id,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            context=context,
            request_id=request_id
        )
    else:
        logger.warning("AI Usage Logger not initialized - usage not logged")
