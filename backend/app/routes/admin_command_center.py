"""
Stage 4: Admin Command Center - Backend Routes & Aggregation
Secure, read-only observability dashboard for admins.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient

from app.clerk_auth import get_current_user_unified, get_clerk_user_data

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# Admin Role Check
# =============================================================================
async def require_admin(user=Depends(get_current_user_unified)):
    """
    Dependency that requires the user to have admin role.
    Checks private_metadata.role === "admin" from Clerk.
    Returns 403 if unauthorized.
    """
    try:
        # Fetch full user data from Clerk to get private_metadata
        clerk_user = await get_clerk_user_data(user.id)
        
        if not clerk_user:
            logger.warning(f"Admin check failed: Could not fetch Clerk user data for {user.id[:8]}...")
            raise HTTPException(status_code=403, detail="Access denied: Unable to verify admin status")
        
        # Check private_metadata.role
        private_metadata = clerk_user.get("private_metadata", {})
        role = private_metadata.get("role", "")
        
        if role != "admin":
            logger.warning(f"Admin access denied for user {user.id[:8]}... (role: {role})")
            raise HTTPException(status_code=403, detail="Access denied: Admin privileges required")
        
        logger.info(f"Admin access granted for user {user.id[:8]}...")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin role check error: {e}")
        raise HTTPException(status_code=403, detail="Access denied: Authorization error")


# =============================================================================
# Dashboard Read Endpoint (Read-Only from Pre-aggregated Data)
# =============================================================================
@router.get("/metrics")
async def get_admin_metrics(admin_user=Depends(require_admin)):
    """
    Get pre-aggregated admin metrics.
    Read-only from admin_system_metrics collection.
    No live queries to Stripe, Clerk, or heavy aggregations.
    """
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        # Get latest metrics document
        metrics = await asyncio.wait_for(
            db.admin_system_metrics.find_one(
                {},
                {"_id": 0},
                sort=[("aggregated_at", -1)]
            ),
            timeout=5.0
        )
        
        client.close()
        
        if not metrics:
            # Return empty structure if no aggregation has run yet
            return JSONResponse(content={
                "status": "pending",
                "message": "Metrics aggregation has not run yet. Data will be available shortly.",
                "aggregated_at": None,
                "user_metrics": {},
                "subscription_metrics": {},
                "ai_metrics": {},
                "system_metrics": {},
                "alerts": []
            })
        
        return JSONResponse(content=metrics)
        
    except asyncio.TimeoutError:
        logger.error("Admin metrics fetch timed out")
        raise HTTPException(status_code=503, detail="Metrics temporarily unavailable")
    except Exception as e:
        logger.error(f"Admin metrics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch metrics")


@router.get("/health")
async def admin_health_check(admin_user=Depends(require_admin)):
    """
    Admin health check endpoint.
    Verifies admin access and returns system status.
    """
    return JSONResponse(content={
        "status": "ok",
        "admin_user": admin_user.id[:8] + "...",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# =============================================================================
# Background Aggregation Job
# =============================================================================
async def aggregate_admin_metrics():
    """
    Background job to aggregate system metrics.
    Runs every 30 minutes via scheduler.
    Stores results in admin_system_metrics collection.
    """
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=30000)
        db = client[db_name]
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_30_ago = now - timedelta(days=30)
        days_24h_ago = now - timedelta(hours=24)
        
        logger.info("Starting admin metrics aggregation...")
        
        # =================================================================
        # User Metrics
        # =================================================================
        total_users = await db.users.count_documents({})
        new_users_24h = await db.users.count_documents({
            "created_at": {"$gte": days_24h_ago}
        })
        
        # Active users (had activity in last 30 days)
        active_users_30d = await db.activity_logs.distinct(
            "user_id",
            {"timestamp": {"$gte": days_30_ago}}
        )
        active_users_count = len(active_users_30d) if active_users_30d else 0
        
        user_metrics = {
            "total_users": total_users,
            "new_users_24h": new_users_24h,
            "active_users_30d": active_users_count
        }
        
        # =================================================================
        # Subscription Metrics (from local cache, not live Stripe)
        # =================================================================
        # Read from users collection subscription data (cached from Stripe webhooks)
        active_subscriptions = await db.users.count_documents({
            "subscription_status": "active"
        })
        
        # MRR calculation from cached subscription data
        mrr_pipeline = [
            {"$match": {"subscription_status": "active"}},
            {"$group": {
                "_id": None,
                "total_mrr": {"$sum": "$subscription_amount"}
            }}
        ]
        mrr_result = await db.users.aggregate(mrr_pipeline).to_list(1)
        mrr = mrr_result[0]["total_mrr"] if mrr_result else 0
        
        # Churn this month (cancelled this month)
        churn_this_month = await db.users.count_documents({
            "subscription_cancelled_at": {"$gte": month_start}
        })
        
        # Failed payments (from payment_events collection if exists)
        failed_payments = await db.payment_events.count_documents({
            "status": "failed",
            "created_at": {"$gte": month_start}
        }) if await db.list_collection_names() else 0
        
        subscription_metrics = {
            "active_subscriptions": active_subscriptions,
            "mrr": round(mrr, 2),
            "churn_this_month": churn_this_month,
            "failed_payments_count": failed_payments
        }
        
        # =================================================================
        # AI Metrics
        # =================================================================
        # Today's AI usage
        ai_today_pipeline = [
            {"$match": {"timestamp": {"$gte": today_start}}},
            {"$group": {
                "_id": None,
                "tokens": {"$sum": "$total_tokens"},
                "cost": {"$sum": "$estimated_cost"},
                "requests": {"$sum": 1}
            }}
        ]
        ai_today = await db.ai_usage_logs.aggregate(ai_today_pipeline).to_list(1)
        ai_today_data = ai_today[0] if ai_today else {"tokens": 0, "cost": 0, "requests": 0}
        
        # Month's AI usage
        ai_month_pipeline = [
            {"$match": {"timestamp": {"$gte": month_start}}},
            {"$group": {
                "_id": None,
                "tokens": {"$sum": "$total_tokens"},
                "cost": {"$sum": "$estimated_cost"},
                "requests": {"$sum": 1}
            }}
        ]
        ai_month = await db.ai_usage_logs.aggregate(ai_month_pipeline).to_list(1)
        ai_month_data = ai_month[0] if ai_month else {"tokens": 0, "cost": 0, "requests": 0}
        
        # Average tokens per request
        avg_tokens = ai_month_data["tokens"] / ai_month_data["requests"] if ai_month_data["requests"] > 0 else 0
        
        # Top 5 AI users this month
        top_users_pipeline = [
            {"$match": {"timestamp": {"$gte": month_start}}},
            {"$group": {
                "_id": "$user_id",
                "total_tokens": {"$sum": "$total_tokens"},
                "total_cost": {"$sum": "$estimated_cost"},
                "request_count": {"$sum": 1}
            }},
            {"$sort": {"total_tokens": -1}},
            {"$limit": 5},
            {"$project": {
                "user_id": "$_id",
                "total_tokens": 1,
                "total_cost": {"$round": ["$total_cost", 4]},
                "request_count": 1,
                "_id": 0
            }}
        ]
        top_users = await db.ai_usage_logs.aggregate(top_users_pipeline).to_list(5)
        
        # Anonymize user IDs for dashboard
        for i, user in enumerate(top_users):
            user["user_id"] = user["user_id"][:8] + "..." if user.get("user_id") else f"user_{i+1}"
        
        ai_metrics = {
            "ai_tokens_today": ai_today_data.get("tokens", 0),
            "ai_tokens_month": ai_month_data.get("tokens", 0),
            "ai_cost_today": round(ai_today_data.get("cost", 0), 4),
            "ai_cost_month": round(ai_month_data.get("cost", 0), 4),
            "ai_requests_today": ai_today_data.get("requests", 0),
            "ai_requests_month": ai_month_data.get("requests", 0),
            "avg_tokens_per_request": round(avg_tokens, 0),
            "top_5_ai_users": top_users
        }
        
        # =================================================================
        # System Metrics
        # =================================================================
        # API error rate (from error_logs collection if exists)
        total_requests_24h = await db.api_logs.count_documents({
            "timestamp": {"$gte": days_24h_ago}
        }) if "api_logs" in await db.list_collection_names() else 0
        
        error_requests_24h = await db.api_logs.count_documents({
            "timestamp": {"$gte": days_24h_ago},
            "status_code": {"$gte": 500}
        }) if "api_logs" in await db.list_collection_names() else 0
        
        api_error_rate = (error_requests_24h / total_requests_24h * 100) if total_requests_24h > 0 else 0
        
        # Rate limit hits (from rate_limit_logs if exists)
        rate_limit_hits = await db.rate_limit_logs.count_documents({
            "timestamp": {"$gte": days_24h_ago}
        }) if "rate_limit_logs" in await db.list_collection_names() else 0
        
        # MongoDB stats
        try:
            db_stats = await db.command("dbStats")
            storage_size = db_stats.get("storageSize", 0)
            # Assume 512MB free tier limit for Atlas
            max_storage = 512 * 1024 * 1024
            storage_percent = (storage_size / max_storage * 100) if max_storage > 0 else 0
        except Exception:
            storage_percent = 0
        
        system_metrics = {
            "api_error_rate": round(api_error_rate, 2),
            "avg_response_time_ms": 0,  # Would need APM integration
            "rate_limit_hits_24h": rate_limit_hits,
            "mongo_storage_percent": round(storage_percent, 1),
            "total_api_requests_24h": total_requests_24h
        }
        
        # =================================================================
        # Alert Flags
        # =================================================================
        alerts = []
        
        # Configurable thresholds
        ai_cost_threshold = float(os.environ.get("ADMIN_AI_COST_ALERT_THRESHOLD", 10.0))
        storage_threshold = float(os.environ.get("ADMIN_STORAGE_ALERT_THRESHOLD", 70.0))
        error_rate_threshold = float(os.environ.get("ADMIN_ERROR_RATE_THRESHOLD", 2.0))
        failed_payment_threshold = int(os.environ.get("ADMIN_FAILED_PAYMENT_THRESHOLD", 5))
        
        if ai_metrics["ai_cost_month"] > ai_cost_threshold:
            alerts.append({
                "type": "ai_cost",
                "severity": "warning",
                "message": f"AI cost this month (${ai_metrics['ai_cost_month']:.2f}) exceeds threshold (${ai_cost_threshold:.2f})"
            })
        
        if system_metrics["mongo_storage_percent"] > storage_threshold:
            alerts.append({
                "type": "storage",
                "severity": "critical",
                "message": f"MongoDB storage ({system_metrics['mongo_storage_percent']:.1f}%) exceeds {storage_threshold}% threshold"
            })
        
        if system_metrics["api_error_rate"] > error_rate_threshold:
            alerts.append({
                "type": "errors",
                "severity": "warning",
                "message": f"API error rate ({system_metrics['api_error_rate']:.1f}%) exceeds {error_rate_threshold}% threshold"
            })
        
        if subscription_metrics["failed_payments_count"] > failed_payment_threshold:
            alerts.append({
                "type": "payments",
                "severity": "warning",
                "message": f"Failed payments ({subscription_metrics['failed_payments_count']}) exceeds threshold ({failed_payment_threshold})"
            })
        
        # =================================================================
        # Store Aggregated Metrics
        # =================================================================
        metrics_doc = {
            "aggregated_at": now,
            "status": "ready",
            "user_metrics": user_metrics,
            "subscription_metrics": subscription_metrics,
            "ai_metrics": ai_metrics,
            "system_metrics": system_metrics,
            "alerts": alerts
        }
        
        # Insert new metrics document (keep history)
        await db.admin_system_metrics.insert_one(metrics_doc)
        
        # Cleanup old metrics - retain for 30 days minimum
        # At 30-min intervals = ~1440 documents per 30 days
        # Estimated storage: ~1KB per doc = ~1.5MB total (minimal impact)
        cutoff = now - timedelta(days=30)
        deleted = await db.admin_system_metrics.delete_many({"aggregated_at": {"$lt": cutoff}})
        
        logger.info(f"Admin metrics aggregation complete: {len(alerts)} alerts, {deleted.deleted_count} old docs cleaned")
        
        client.close()
        return metrics_doc
        
    except Exception as e:
        logger.error(f"Admin metrics aggregation failed: {e}")
        raise


# =============================================================================
# Manual Aggregation Trigger (Admin Only)
# =============================================================================
@router.post("/aggregate")
async def trigger_aggregation(admin_user=Depends(require_admin)):
    """
    Manually trigger metrics aggregation.
    Admin only - for testing and immediate updates.
    """
    try:
        result = await aggregate_admin_metrics()
        return JSONResponse(content={
            "status": "success",
            "aggregated_at": result["aggregated_at"].isoformat(),
            "alerts_count": len(result["alerts"])
        })
    except Exception as e:
        logger.error(f"Manual aggregation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


# =============================================================================
# Historical Metrics (for charts)
# =============================================================================
@router.get("/history")
async def get_metrics_history(
    hours: int = 24,
    admin_user=Depends(require_admin)
):
    """
    Get historical metrics for charts.
    Returns last N hours of aggregated data.
    Max retention: 30 days (720 hours).
    """
    # Cap at 30 days to match retention policy
    hours = min(hours, 720)
    
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        history = await db.admin_system_metrics.find(
            {"aggregated_at": {"$gte": cutoff}},
            {"_id": 0}
        ).sort("aggregated_at", 1).to_list(100)
        
        client.close()
        
        # Serialize datetime objects
        for doc in history:
            if "aggregated_at" in doc:
                doc["aggregated_at"] = doc["aggregated_at"].isoformat()
        
        return JSONResponse(content={"history": history})
        
    except Exception as e:
        logger.error(f"Metrics history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")
