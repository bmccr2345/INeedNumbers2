"""
AI Usage Logs Index Management - Stage 1, 2 & 4
Creates and manages indexes for ai_usage_logs, ai_usage_monthly, and admin_system_metrics collections.
"""
import asyncio
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def create_ai_usage_indexes():
    """
    Create indexes for AI usage collections:
    
    ai_usage_logs (Stage 1):
    - user_id: For filtering by user
    - timestamp: For time-based queries
    - compound (user_id, timestamp): For efficient user + time range queries
    
    ai_usage_monthly (Stage 2):
    - user_id: For filtering by user
    - year_month: For filtering by month
    - compound (user_id, year_month): For efficient lookups (unique per user-month)
    
    admin_system_metrics (Stage 4):
    - aggregated_at: For getting latest metrics and cleanup
    """
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # =================================================================
        # Stage 1: ai_usage_logs indexes
        # =================================================================
        print("Creating ai_usage_logs indexes...")
        logs_collection = db.ai_usage_logs
        
        await logs_collection.create_index("user_id")
        await logs_collection.create_index("timestamp")
        await logs_collection.create_index([("user_id", 1), ("timestamp", -1)])
        
        logs_indexes = await logs_collection.index_information()
        print(f"  ai_usage_logs indexes: {list(logs_indexes.keys())}")
        
        # =================================================================
        # Stage 2: ai_usage_monthly indexes
        # =================================================================
        print("Creating ai_usage_monthly indexes...")
        monthly_collection = db.ai_usage_monthly
        
        await monthly_collection.create_index("user_id")
        await monthly_collection.create_index("year_month")
        # Compound index - also serves as unique constraint for upsert
        await monthly_collection.create_index(
            [("user_id", 1), ("year_month", 1)],
            unique=True
        )
        
        monthly_indexes = await monthly_collection.index_information()
        print(f"  ai_usage_monthly indexes: {list(monthly_indexes.keys())}")
        
        # =================================================================
        # Stage 4: admin_system_metrics indexes
        # =================================================================
        print("Creating admin_system_metrics indexes...")
        admin_collection = db.admin_system_metrics
        
        await admin_collection.create_index([("aggregated_at", -1)])
        
        admin_indexes = await admin_collection.index_information()
        print(f"  admin_system_metrics indexes: {list(admin_indexes.keys())}")
        
        print("\nAll AI usage indexes created successfully!")
        logger.info("AI usage indexes created successfully")
        
        client.close()
        return True
        
    except Exception as e:
        logger.error(f"Failed to create AI usage indexes: {e}")
        print(f"Error creating indexes: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(create_ai_usage_indexes())
