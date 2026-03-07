"""
Background scheduler for admin metrics aggregation.
Runs every 30 minutes in PRODUCTION ONLY.
Includes distributed lock for multi-worker safety.
"""
import asyncio
import logging
import os
import time
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

_scheduler_task = None
_running = False

# Lock configuration
LOCK_ID = "admin_aggregation_lock"
LOCK_DURATION_MINUTES = 5


async def acquire_distributed_lock() -> bool:
    """
    Attempt to acquire distributed lock using MongoDB atomic operation.
    
    Lock Logic:
    - If lock doesn't exist OR locked_until < now -> acquire lock
    - Otherwise -> skip (another worker has the lock)
    
    Returns True if lock acquired, False otherwise.
    Uses single atomic operation to prevent race conditions.
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        now = datetime.now(timezone.utc)
        lock_until = now + timedelta(minutes=LOCK_DURATION_MINUTES)
        
        # Atomic find_one_and_update with upsert
        # Only acquires if: document doesn't exist OR locked_until has expired
        result = await db.admin_scheduler_lock.find_one_and_update(
            {
                "_id": LOCK_ID,
                "$or": [
                    {"locked_until": {"$lt": now}},  # Lock expired
                    {"locked_until": {"$exists": False}}  # No lock set
                ]
            },
            {
                "$set": {
                    "locked_until": lock_until,
                    "locked_by": f"worker_{os.getpid()}",
                    "locked_at": now
                }
            },
            upsert=True,
            return_document=True
        )
        
        client.close()
        
        # If we got a result and our lock time matches, we acquired it
        if result and result.get("locked_until") == lock_until:
            logger.info(f"Acquired aggregation lock until {lock_until.isoformat()}")
            return True
        
        return False
        
    except Exception as e:
        # If we can't acquire lock (e.g., duplicate key on race), another worker got it
        if "duplicate key" in str(e).lower() or "E11000" in str(e):
            logger.debug("Lock already held by another worker")
            return False
        
        # Log other errors but don't crash - treat as lock not acquired
        logger.warning(f"Lock acquisition error (non-blocking): {e}")
        return False


async def run_aggregation_job():
    """
    Run the aggregation with distributed lock and observability logging.
    """
    start_time = time.time()
    start_ts = datetime.now(timezone.utc)
    
    logger.info(f"[SCHEDULER] Aggregation job starting at {start_ts.isoformat()}")
    
    try:
        # Attempt to acquire distributed lock
        if not await acquire_distributed_lock():
            logger.info("[SCHEDULER] Skipping - lock held by another worker")
            return
        
        # Run aggregation
        from app.routes.admin_command_center import aggregate_admin_metrics
        result = await aggregate_admin_metrics()
        
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        
        logger.info(
            f"[SCHEDULER] Aggregation COMPLETED - "
            f"duration={duration_ms:.0f}ms, "
            f"alerts={len(result.get('alerts', []))}, "
            f"status=SUCCESS"
        )
        
    except Exception as e:
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        
        logger.error(
            f"[SCHEDULER] Aggregation FAILED - "
            f"duration={duration_ms:.0f}ms, "
            f"error={str(e)}, "
            f"status=FAILURE"
        )
        # Do NOT re-raise - scheduler loop must continue


async def scheduler_loop():
    """Background loop that runs aggregation every 30 minutes."""
    global _running
    _running = True
    
    # Initial delay to let the server start
    logger.info("[SCHEDULER] Waiting 60s before first aggregation run...")
    await asyncio.sleep(60)
    
    while _running:
        try:
            await run_aggregation_job()
        except Exception as e:
            # Catch-all to ensure loop never crashes
            logger.error(f"[SCHEDULER] Unexpected error in loop: {e}")
        
        # Wait 30 minutes before next run
        logger.info("[SCHEDULER] Next run in 30 minutes")
        await asyncio.sleep(30 * 60)


def start_scheduler():
    """Start the background scheduler."""
    global _scheduler_task
    
    if _scheduler_task is None or _scheduler_task.done():
        loop = asyncio.get_event_loop()
        _scheduler_task = loop.create_task(scheduler_loop())
        logger.info("[SCHEDULER] Admin metrics scheduler started (30-minute interval)")


def stop_scheduler():
    """Stop the background scheduler."""
    global _running, _scheduler_task
    _running = False
    
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("[SCHEDULER] Admin metrics scheduler stopped")
