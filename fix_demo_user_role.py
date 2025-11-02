#!/usr/bin/env python3
"""
Fix demo user role in database
Update demo@demo.com role from 'user' to 'master_admin'
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.append('/app/backend')

async def fix_demo_user_role():
    """Fix the demo user role in the database"""
    print("🔧 FIXING DEMO USER ROLE IN DATABASE")
    print("=" * 60)
    
    try:
        # Import the database connection from the backend
        from motor.motor_asyncio import AsyncIOMotorClient
        
        # Use the same MongoDB URL as the backend
        MONGO_URL = "mongodb://localhost:27017"
        DB_NAME = "test_database"
        
        print(f"🔗 Connecting to MongoDB: {MONGO_URL}")
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test connection
        await db.command("ping")
        print("✅ MongoDB connection successful")
        
        # Find the demo user
        demo_email = "demo@demo.com"
        print(f"🔍 Looking for user: {demo_email}")
        
        user = await db.users.find_one({"email": demo_email})
        
        if user:
            print("✅ Demo user found in database")
            print(f"   ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Current Role: {user.get('role')}")
            print(f"   Plan: {user.get('plan')}")
            print(f"   Status: {user.get('status')}")
            
            current_role = user.get('role')
            
            if current_role == 'master_admin':
                print("✅ Role is already 'master_admin' - no update needed")
                return True, {"status": "already_correct", "role": current_role}
            elif current_role == 'user':
                print("🔧 Updating role from 'user' to 'master_admin'...")
                
                # Update the user role
                update_result = await db.users.update_one(
                    {"email": demo_email},
                    {
                        "$set": {
                            "role": "master_admin",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if update_result.modified_count == 1:
                    print("✅ Role updated successfully!")
                    
                    # Verify the update
                    updated_user = await db.users.find_one({"email": demo_email})
                    if updated_user and updated_user.get('role') == 'master_admin':
                        print("✅ Update verified - role is now 'master_admin'")
                        return True, {
                            "status": "updated_successfully",
                            "old_role": current_role,
                            "new_role": "master_admin",
                            "user_id": user.get('id')
                        }
                    else:
                        print("❌ Update verification failed")
                        return False, {"error": "update_verification_failed"}
                else:
                    print("❌ Update failed - no documents modified")
                    return False, {"error": "update_failed"}
            else:
                print(f"⚠️  Unexpected current role: {current_role}")
                return False, {"error": "unexpected_role", "current_role": current_role}
        else:
            print("❌ Demo user not found in database")
            return False, {"error": "user_not_found"}
            
    except Exception as e:
        print(f"❌ Error fixing demo user role: {e}")
        return False, {"error": str(e)}
    finally:
        if 'client' in locals():
            client.close()

async def verify_fix():
    """Verify the fix by testing the API"""
    print("\n🔍 VERIFYING FIX VIA API TEST")
    print("=" * 60)
    
    try:
        import requests
        
        base_url = "https://realestate-numbers.preview.emergentagent.com"
        
        # Login and check role
        login_data = {
            "email": "demo@demo.com",
            "password": "demo123",
            "remember_me": False
        }
        
        print("🔑 Testing login and /api/auth/me...")
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            timeout=15
        )
        
        if login_response.status_code == 200:
            print("✅ Login successful")
            
            # Check /api/auth/me
            session = requests.Session()
            session.cookies = login_response.cookies
            
            me_response = session.get(f"{base_url}/api/auth/me", timeout=15)
            
            if me_response.status_code == 200:
                me_data = me_response.json()
                role = me_data.get('role')
                
                print(f"📋 /api/auth/me response:")
                print(f"   Email: {me_data.get('email')}")
                print(f"   Role: {role}")
                print(f"   Plan: {me_data.get('plan')}")
                
                if role == 'master_admin':
                    print("✅ VERIFICATION SUCCESSFUL: API now returns 'master_admin'")
                    return True, {"api_role": role, "status": "verified"}
                else:
                    print(f"❌ VERIFICATION FAILED: API still returns '{role}'")
                    return False, {"api_role": role, "status": "still_stale"}
            else:
                print(f"❌ /api/auth/me failed: {me_response.status_code}")
                return False, {"error": "auth_me_failed"}
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            return False, {"error": "login_failed"}
            
    except Exception as e:
        print(f"❌ Error verifying fix: {e}")
        return False, {"error": str(e)}

async def main():
    """Main function to fix and verify the demo user role"""
    print("🚀 DEMO USER ROLE FIX UTILITY")
    print("=" * 80)
    print("PURPOSE: Fix demo@demo.com role from 'user' to 'master_admin'")
    print("ISSUE: /api/auth/me returning stale role data")
    print("=" * 80)
    
    # Step 1: Fix the database
    fix_success, fix_result = await fix_demo_user_role()
    
    if fix_success:
        print(f"\n✅ DATABASE FIX: {fix_result.get('status', 'completed')}")
        
        # Step 2: Verify the fix
        verify_success, verify_result = await verify_fix()
        
        if verify_success:
            print(f"\n🎉 COMPLETE SUCCESS: Role fix verified via API")
            print("   The /api/auth/me endpoint now returns 'master_admin'")
            print("   Frontend should now show correct role")
            return 0
        else:
            print(f"\n⚠️  DATABASE UPDATED BUT API VERIFICATION FAILED")
            print("   Database was updated but API still returns old role")
            print("   May need backend restart or cache clearing")
            return 1
    else:
        print(f"\n❌ DATABASE FIX FAILED: {fix_result.get('error', 'unknown error')}")
        return 2

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)