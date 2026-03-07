"""
Background scheduler for admin metrics aggregation.
Runs every 30 minutes.
"""
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_scheduler_task = None
_running = False


async def run_aggregation_job():
    """Run the aggregation and log results."""
    try:
        from app.routes.admin_command_center import aggregate_admin_metrics
        result = await aggregate_admin_metrics()
        logger.info(f"Scheduled aggregation complete: {len(result.get('alerts', []))} alerts")
    except Exception as e:
        logger.error(f"Scheduled aggregation failed: {e}")


async def scheduler_loop():
    """Background loop that runs aggregation every 30 minutes."""
    global _running
    _running = True
    
    # Initial delay to let the server start
    await asyncio.sleep(60)  # Wait 1 minute after startup
    
    while _running:
        try:
            logger.info("Starting scheduled admin metrics aggregation...")
            await run_aggregation_job()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        
        # Wait 30 minutes before next run
        await asyncio.sleep(30 * 60)


def start_scheduler():
    """Start the background scheduler."""
    global _scheduler_task
    
    if _scheduler_task is None or _scheduler_task.done():
        loop = asyncio.get_event_loop()
        _scheduler_task = loop.create_task(scheduler_loop())
        logger.info("Admin metrics scheduler started (30-minute interval)")


def stop_scheduler():
    """Stop the background scheduler."""
    global _running, _scheduler_task
    _running = False
    
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("Admin metrics scheduler stopped")
