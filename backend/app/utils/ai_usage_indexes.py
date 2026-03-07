"""
AI Usage Logs Index Management - Stage 1
Creates and manages indexes for the ai_usage_logs collection.
"""
import asyncio
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def create_ai_usage_indexes():
    """
    Create indexes for ai_usage_logs collection:
    - user_id: For filtering by user
    - timestamp: For time-based queries
    - compound (user_id, timestamp): For efficient user + time range queries
    """
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        collection = db.ai_usage_logs
        
        # Create indexes
        await collection.create_index("user_id")
        await collection.create_index("timestamp")
        await collection.create_index([("user_id", 1), ("timestamp", -1)])
        
        logger.info("AI usage indexes created successfully")
        print("AI usage indexes created successfully:")
        print("  - user_id")
        print("  - timestamp")
        print("  - compound (user_id, timestamp)")
        
        # List all indexes for verification
        indexes = await collection.index_information()
        print(f"\nCurrent indexes on ai_usage_logs: {list(indexes.keys())}")
        
        client.close()
        return True
        
    except Exception as e:
        logger.error(f"Failed to create AI usage indexes: {e}")
        print(f"Error creating indexes: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(create_ai_usage_indexes())
