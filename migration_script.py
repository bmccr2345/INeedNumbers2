"""
Temporary migration script - to be run directly by backend
"""
import asyncio
import sys
import os
sys.path.append('/app/backend')

from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def migrate_users():
    print('=== USER MIGRATION: LOCAL TO ATLAS ===')
    print(f'Migration started at: {datetime.now()}')
    
    try:
        # Local connection (synchronous)
        print('\n--- Step 1: Connecting to Local MongoDB ---')
        local_client = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=5000)
        local_db = local_client['test_database']
        local_users = local_db.users
        
        # Get all users
        users_to_migrate = list(local_users.find({}))
        local_count = len(users_to_migrate)
        print(f'✅ Found {local_count} users in local database')
        
        print('\n--- Users to migrate ---')
        for user in users_to_migrate:
            email = user.get('email', 'N/A')
            name = user.get('full_name', 'N/A') 
            plan = user.get('plan', 'N/A')
            role = user.get('role', 'N/A')
            print(f'  {email} | {name} | {plan} | {role}')
        
        # Atlas connection (async - same as backend)
        print('\n--- Step 2: Connecting to MongoDB Atlas ---')
        atlas_uri = os.environ.get('MONGO_URL')
        if not atlas_uri or 'localhost' in atlas_uri:
            raise Exception('MONGO_URL not set to Atlas URI')
            
        atlas_client = AsyncIOMotorClient(atlas_uri)
        atlas_db = atlas_client[os.environ.get('DB_NAME', 'ineednumbers')]
        
        # Test Atlas connection
        await atlas_client.admin.command('ping')
        print('✅ Connected to MongoDB Atlas (using backend connection)')
        
        # Check existing users
        atlas_users = atlas_db.users
        atlas_count_before = await atlas_users.count_documents({})
        print(f'✅ Atlas users before migration: {atlas_count_before}')
        
        print('\n--- Step 3: Migrating User Data ---')
        
        if local_count == 0:
            print('❌ No users to migrate')
            return
            
        # Convert ObjectId to handle serialization
        for user in users_to_migrate:
            if '_id' in user:
                user['_id'] = str(user['_id'])  # Convert to string temporarily
                
        # Insert users
        result = await atlas_users.insert_many(users_to_migrate, ordered=False)
        print(f'✅ Inserted {len(result.inserted_ids)} users into Atlas')
        
        print('\n--- Step 4: Verification ---')
        atlas_count_after = await atlas_users.count_documents({})
        print(f'✅ Atlas users after migration: {atlas_count_after}')
        
        # Verify test user
        test_user = await atlas_users.find_one({'email': 'bmccr@msn.com'})
        if test_user:
            print('✅ Test user bmccr@msn.com found in Atlas')
            hash_preview = test_user.get('hashed_password', '')[:50] + '...' if test_user.get('hashed_password') else 'None'
            print(f'✅ Password hash preserved: {hash_preview}')
        else:
            print('❌ Test user not found in Atlas')
            
        print('\n=== MIGRATION SUMMARY ===')
        print(f'Local users: {local_count}')
        print(f'Atlas users after migration: {atlas_count_after}')
        print(f'Status: {"SUCCESS" if atlas_count_after >= local_count else "PARTIAL"}')
        
        # Close connections
        local_client.close()
        atlas_client.close()
        
    except Exception as e:
        print(f'❌ Migration failed: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(migrate_users())