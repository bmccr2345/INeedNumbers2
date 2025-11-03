#!/usr/bin/env python3
"""
Specific test for user plan data issue - bmccr23@gmail.com
Testing /api/auth/me endpoint to verify plan data consistency
"""

import requests
import json
import sys

class PlanDataTester:
    def __init__(self):
        self.base_url = "https://authflow-fix-4.preview.emergentagent.com"
        self.user_email = "bmccr23@gmail.com"
        self.user_password = "Goosey23!!23"
        
    def test_user_plan_data(self):
        """Test the specific user plan data issue"""
        print("🎯 TESTING USER PLAN DATA ISSUE")
        print("=" * 60)
        print(f"User: {self.user_email}")
        print(f"Expected Plan: STARTER")
        print(f"Expected Role: master_admin")
        print("=" * 60)
        
        try:
            # Create session for cookie-based auth
            session = requests.Session()
            
            # Step 1: Login
            print("\n🔍 Step 1: Login...")
            login_data = {
                "email": self.user_email,
                "password": self.user_password,
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            print(f"Login Status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                print("✅ Login successful")
                
                # Check login response user data
                login_data_response = login_response.json()
                login_user = login_data_response.get('user', {})
                
                if login_user:
                    print(f"\n📊 LOGIN RESPONSE USER DATA:")
                    print(f"   Email: {login_user.get('email')}")
                    print(f"   Plan: {login_user.get('plan')}")
                    print(f"   Role: {login_user.get('role')}")
                    print(f"   Status: {login_user.get('status')}")
                    print(f"   ID: {login_user.get('id')}")
                
                # Step 2: Test /api/auth/me endpoint
                print("\n🔍 Step 2: Testing /api/auth/me...")
                
                me_response = session.get(
                    f"{self.base_url}/api/auth/me",
                    timeout=15
                )
                
                print(f"/api/auth/me Status: {me_response.status_code}")
                
                if me_response.status_code == 200:
                    print("✅ /api/auth/me successful")
                    
                    me_data = me_response.json()
                    
                    print(f"\n📊 /API/AUTH/ME RESPONSE DATA:")
                    print(f"   Email: {me_data.get('email')}")
                    print(f"   Plan: {me_data.get('plan')}")
                    print(f"   Role: {me_data.get('role')}")
                    print(f"   Status: {me_data.get('status')}")
                    print(f"   ID: {me_data.get('id')}")
                    
                    # Step 3: Compare and analyze
                    print("\n🔍 Step 3: Analysis...")
                    
                    api_plan = me_data.get('plan')
                    api_role = me_data.get('role')
                    expected_plan = "STARTER"
                    expected_role = "master_admin"
                    
                    print(f"\n📋 COMPARISON:")
                    print(f"   Expected Plan: {expected_plan}")
                    print(f"   Actual Plan:   {api_plan}")
                    print(f"   Plan Match:    {'✅' if api_plan == expected_plan else '❌'}")
                    
                    print(f"   Expected Role: {expected_role}")
                    print(f"   Actual Role:   {api_role}")
                    print(f"   Role Match:    {'✅' if api_role == expected_role else '❌'}")
                    
                    # Check consistency between login and /api/auth/me
                    login_plan = login_user.get('plan') if login_user else None
                    login_role = login_user.get('role') if login_user else None
                    
                    print(f"\n🔄 CONSISTENCY CHECK:")
                    print(f"   Login Plan:    {login_plan}")
                    print(f"   Auth/Me Plan:  {api_plan}")
                    print(f"   Plans Match:   {'✅' if login_plan == api_plan else '❌'}")
                    
                    print(f"   Login Role:    {login_role}")
                    print(f"   Auth/Me Role:  {api_role}")
                    print(f"   Roles Match:   {'✅' if login_role == api_role else '❌'}")
                    
                    # Step 4: Multiple calls to check caching
                    print("\n🔍 Step 4: Testing for caching issues...")
                    
                    for i in range(3):
                        cache_response = session.get(f"{self.base_url}/api/auth/me", timeout=15)
                        if cache_response.status_code == 200:
                            cache_data = cache_response.json()
                            cache_plan = cache_data.get('plan')
                            print(f"   Call #{i+1} Plan: {cache_plan}")
                        else:
                            print(f"   Call #{i+1} Failed: {cache_response.status_code}")
                    
                    # Step 5: Fresh session test
                    print("\n🔍 Step 5: Testing fresh session...")
                    
                    fresh_session = requests.Session()
                    fresh_login = fresh_session.post(
                        f"{self.base_url}/api/auth/login",
                        json=login_data,
                        timeout=15
                    )
                    
                    if fresh_login.status_code == 200:
                        fresh_me = fresh_session.get(f"{self.base_url}/api/auth/me", timeout=15)
                        if fresh_me.status_code == 200:
                            fresh_data = fresh_me.json()
                            fresh_plan = fresh_data.get('plan')
                            print(f"   Fresh Session Plan: {fresh_plan}")
                            print(f"   Consistent:         {'✅' if fresh_plan == api_plan else '❌'}")
                        else:
                            print(f"   Fresh /api/auth/me failed: {fresh_me.status_code}")
                    else:
                        print(f"   Fresh login failed: {fresh_login.status_code}")
                    
                    # Final assessment
                    print("\n" + "=" * 60)
                    print("🏁 FINAL ASSESSMENT")
                    print("=" * 60)
                    
                    if api_plan == expected_plan and api_role == expected_role:
                        print("✅ SUCCESS: API returns correct plan and role data")
                        print("   The database and API are in sync")
                        print("   Frontend issue may be elsewhere (caching, display logic)")
                        return True
                    else:
                        print("❌ ISSUE CONFIRMED: API returns incorrect data")
                        print(f"   Database shows: plan='{expected_plan}', role='{expected_role}'")
                        print(f"   API returns: plan='{api_plan}', role='{api_role}'")
                        print("   This confirms the reported issue")
                        return False
                        
                else:
                    print(f"❌ /api/auth/me failed: {me_response.status_code}")
                    try:
                        error_data = me_response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Response: {me_response.text[:200]}")
                    return False
                    
            else:
                print(f"❌ Login failed: {login_response.status_code}")
                try:
                    error_data = login_response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {login_response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Test error: {e}")
            return False

if __name__ == "__main__":
    tester = PlanDataTester()
    success = tester.test_user_plan_data()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 TEST COMPLETED - API DATA IS CORRECT")
        print("   Issue may be in frontend caching or display logic")
    else:
        print("🚨 TEST COMPLETED - API DATA ISSUE CONFIRMED")
        print("   Backend needs investigation and fix")
    print("=" * 60)
    
    sys.exit(0 if success else 1)