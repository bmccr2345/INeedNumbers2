#!/usr/bin/env python3
"""
Database role verification test
Check what role is actually stored in the database for demo user
"""

import requests
import sys
import json

class DatabaseRoleChecker:
    def __init__(self, base_url="https://agent-finance.preview.emergentagent.com"):
        self.base_url = base_url
        self.demo_email = "demo@demo.com"
        self.demo_password = "demo123"
        
    def check_database_role_via_api(self):
        """Check database role by analyzing API responses"""
        print("🗄️ CHECKING DATABASE ROLE VIA API ANALYSIS")
        print("=" * 60)
        
        try:
            # Login and get user data
            login_data = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            print(f"🔑 Logging in as {self.demo_email}...")
            login_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("✅ Login successful")
                login_data_response = login_response.json()
                
                # Get user data from login response
                if 'user' in login_data_response:
                    login_user = login_data_response['user']
                    print(f"📋 Login response user data:")
                    print(f"   ID: {login_user.get('id')}")
                    print(f"   Email: {login_user.get('email')}")
                    print(f"   Role: {login_user.get('role')}")
                    print(f"   Plan: {login_user.get('plan')}")
                    print(f"   Status: {login_user.get('status')}")
                
                # Get user data from /api/auth/me
                session = requests.Session()
                session.cookies = login_response.cookies
                
                me_response = session.get(f"{self.base_url}/api/auth/me", timeout=15)
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    print(f"\n📋 /api/auth/me response user data:")
                    print(f"   ID: {me_data.get('id')}")
                    print(f"   Email: {me_data.get('email')}")
                    print(f"   Role: {me_data.get('role')}")
                    print(f"   Plan: {me_data.get('plan')}")
                    print(f"   Status: {me_data.get('status')}")
                    print(f"   Created: {me_data.get('created_at')}")
                    print(f"   Updated: {me_data.get('updated_at')}")
                    
                    # Compare login vs /api/auth/me data
                    if 'user' in login_data_response:
                        login_role = login_data_response['user'].get('role')
                        me_role = me_data.get('role')
                        
                        if login_role == me_role:
                            print(f"\n✅ CONSISTENT: Both login and /api/auth/me return role: {me_role}")
                        else:
                            print(f"\n❌ INCONSISTENT: Login role: {login_role}, /api/auth/me role: {me_role}")
                        
                        # Check if role is what we expect
                        if me_role == 'master_admin':
                            print("✅ DATABASE ROLE CORRECT: Role is 'master_admin' as expected")
                            return True, {
                                "database_role": me_role,
                                "status": "correct",
                                "user_data": me_data
                            }
                        elif me_role == 'user':
                            print("❌ DATABASE ROLE STALE: Role is 'user' but should be 'master_admin'")
                            print("🔧 DIAGNOSIS: Database was not actually updated or update didn't persist")
                            return False, {
                                "database_role": me_role,
                                "status": "stale",
                                "user_data": me_data,
                                "issue": "Database still contains old role 'user'"
                            }
                        else:
                            print(f"⚠️  DATABASE ROLE UNEXPECTED: Role is '{me_role}'")
                            return False, {
                                "database_role": me_role,
                                "status": "unexpected",
                                "user_data": me_data
                            }
                    else:
                        print("⚠️  No user data in login response")
                        return False, {"error": "no_user_in_login"}
                else:
                    print(f"❌ /api/auth/me failed: {me_response.status_code}")
                    return False, {"error": "auth_me_failed"}
            else:
                print(f"❌ Login failed: {login_response.status_code}")
                return False, {"error": "login_failed"}
                
        except Exception as e:
            print(f"❌ Error checking database role: {e}")
            return False, {"error": str(e)}
    
    def suggest_database_update_method(self):
        """Suggest how to update the database role"""
        print("\n🔧 DATABASE UPDATE SUGGESTIONS")
        print("=" * 60)
        print("To update the demo user role from 'user' to 'master_admin':")
        print()
        print("METHOD 1: Direct MongoDB Update (if you have database access)")
        print("   db.users.updateOne(")
        print("     { email: 'demo@demo.com' },")
        print("     { $set: { role: 'master_admin' } }")
        print("   )")
        print()
        print("METHOD 2: Backend API Update (if admin endpoint exists)")
        print("   PUT /api/admin/users/{user_id}")
        print("   { 'role': 'master_admin' }")
        print()
        print("METHOD 3: Manual Database Script")
        print("   Create a script to update the user role in the database")
        print()
        print("METHOD 4: Check if there's a user management interface")
        print("   Look for admin console or user management endpoints")
        print()
        print("VERIFICATION:")
        print("   After updating, run this test again to verify the change")
        
    def run_diagnosis(self):
        """Run complete database role diagnosis"""
        print("🔍 DATABASE ROLE DIAGNOSIS")
        print("=" * 80)
        print("ISSUE: /api/auth/me returning stale role data")
        print("EXPECTED: demo@demo.com should have role 'master_admin'")
        print("REPORTED: API returns role 'user' (stale)")
        print("=" * 80)
        
        success, result = self.check_database_role_via_api()
        
        print("\n" + "=" * 60)
        print("🎯 DIAGNOSIS RESULTS:")
        
        if success:
            print("✅ DATABASE ROLE IS CORRECT")
            print("   The issue may have been resolved")
        else:
            if result.get('database_role') == 'user':
                print("❌ DATABASE ROLE IS STALE")
                print("   Root cause: Database was not actually updated")
                print("   Solution: Update the database to set role = 'master_admin'")
                self.suggest_database_update_method()
            else:
                print("⚠️  UNEXPECTED DATABASE STATE")
                print(f"   Current role: {result.get('database_role', 'unknown')}")
        
        print("=" * 60)
        
        return result

if __name__ == "__main__":
    checker = DatabaseRoleChecker()
    result = checker.run_diagnosis()
    
    # Exit with appropriate code
    if result.get('database_role') == 'master_admin':
        print("\n🎉 ISSUE RESOLVED: Database contains correct role")
        sys.exit(0)
    elif result.get('database_role') == 'user':
        print("\n❌ ISSUE CONFIRMED: Database contains stale role")
        sys.exit(1)
    else:
        print("\n⚠️  DIAGNOSIS INCOMPLETE: Unable to determine database state")
        sys.exit(2)