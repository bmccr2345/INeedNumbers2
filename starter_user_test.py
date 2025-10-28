#!/usr/bin/env python3
"""
STARTER User Authentication Test
Test the /api/auth/me endpoint for STARTER user startertest@demo.com
to verify what plan data is being returned by the authentication API.
"""

import requests
import sys
import json
from datetime import datetime

class StarterUserTester:
    def __init__(self, base_url="https://agent-tracker-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def test_starter_user_auth_me_endpoint(self):
        """Test /api/auth/me endpoint for STARTER user startertest@demo.com"""
        print("\n🎯 TESTING STARTER USER AUTH/ME ENDPOINT...")
        print("   Testing: startertest@demo.com authentication and plan data")
        print("   Expected: Login successful, /api/auth/me returns plan='STARTER'")
        print("   Issue: Frontend shows PRO features when database shows STARTER")
        
        try:
            session = requests.Session()
            
            # Step 1: Login with STARTER user credentials
            login_data = {
                "email": "startertest@demo.com",
                "password": "demo123",
                "remember_me": False
            }
            
            print(f"   🔍 Step 1: Attempting login with {login_data['email']}")
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            print(f"   🔍 Login response status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                print("   ✅ Step 1: STARTER user login successful")
                
                try:
                    login_response_data = login_response.json()
                    print(f"   🔍 Login response keys: {list(login_response_data.keys())}")
                    
                    # Check if user data is in login response
                    if 'user' in login_response_data:
                        login_user_data = login_response_data['user']
                        login_plan = login_user_data.get('plan')
                        print(f"   🔍 Plan in login response: {login_plan}")
                        
                        if login_plan == 'STARTER':
                            print("   ✅ Login response shows correct STARTER plan")
                        else:
                            print(f"   ❌ Login response shows incorrect plan: {login_plan} (expected STARTER)")
                    else:
                        print("   ⚠️  No user data in login response")
                        
                except Exception as e:
                    print(f"   ⚠️  Could not parse login response: {e}")
                
                # Step 2: Test /api/auth/me endpoint
                print("   🔍 Step 2: Testing /api/auth/me endpoint")
                
                me_response = session.get(
                    f"{self.base_url}/api/auth/me",
                    timeout=15
                )
                
                print(f"   🔍 /api/auth/me response status: {me_response.status_code}")
                
                if me_response.status_code == 200:
                    print("   ✅ Step 2: /api/auth/me successful")
                    
                    try:
                        me_data = me_response.json()
                        print(f"   🔍 /api/auth/me response keys: {list(me_data.keys())}")
                        
                        # Extract key user data
                        user_email = me_data.get('email')
                        user_plan = me_data.get('plan')
                        user_role = me_data.get('role')
                        user_status = me_data.get('status')
                        
                        print(f"   📊 User Data from /api/auth/me:")
                        print(f"      Email: {user_email}")
                        print(f"      Plan: {user_plan}")
                        print(f"      Role: {user_role}")
                        print(f"      Status: {user_status}")
                        
                        # Critical check: Is plan STARTER as expected?
                        if user_plan == 'STARTER':
                            print("   ✅ CRITICAL: /api/auth/me returns correct STARTER plan")
                            plan_correct = True
                        else:
                            print(f"   ❌ CRITICAL: /api/auth/me returns incorrect plan: {user_plan} (expected STARTER)")
                            print("   🚨 This explains why frontend shows PRO features!")
                            plan_correct = False
                        
                        # Verify email matches
                        if user_email == 'startertest@demo.com':
                            print("   ✅ Correct user email confirmed")
                            email_correct = True
                        else:
                            print(f"   ❌ Incorrect user email: {user_email}")
                            email_correct = False
                        
                        # Step 3: Test consistency between login and /api/auth/me
                        print("   🔍 Step 3: Checking consistency between login and /api/auth/me")
                        
                        consistency_check = True
                        if 'user' in login_response_data:
                            login_user = login_response_data['user']
                            
                            # Compare key fields
                            fields_to_compare = ['email', 'plan', 'role', 'status']
                            for field in fields_to_compare:
                                login_value = login_user.get(field)
                                me_value = me_data.get(field)
                                
                                if login_value == me_value:
                                    print(f"      ✅ {field}: {login_value} (consistent)")
                                else:
                                    print(f"      ❌ {field}: login={login_value}, me={me_value} (inconsistent)")
                                    consistency_check = False
                        else:
                            print("      ⚠️  Cannot compare - no user data in login response")
                            consistency_check = False
                        
                        # Overall assessment
                        overall_success = plan_correct and email_correct and consistency_check
                        
                        if overall_success:
                            print("   🎉 STARTER USER AUTH/ME TEST PASSED")
                        else:
                            print("   ❌ STARTER USER AUTH/ME TEST FAILED")
                            if not plan_correct:
                                print("      🚨 ROOT CAUSE: /api/auth/me returns wrong plan data")
                                print("      🚨 This causes frontend to show PRO features for STARTER user")
                        
                        return overall_success, {
                            "login_successful": True,
                            "me_endpoint_successful": True,
                            "user_email": user_email,
                            "user_plan": user_plan,
                            "user_role": user_role,
                            "user_status": user_status,
                            "plan_correct": plan_correct,
                            "email_correct": email_correct,
                            "consistency_check": consistency_check,
                            "login_response": login_response_data,
                            "me_response": me_data
                        }
                        
                    except Exception as e:
                        print(f"   ❌ Error parsing /api/auth/me response: {e}")
                        print(f"   ❌ Raw response: {me_response.text[:300]}")
                        return False, {"error": "Could not parse me response", "exception": str(e)}
                        
                else:
                    print(f"   ❌ Step 2: /api/auth/me failed with status {me_response.status_code}")
                    try:
                        error_data = me_response.json()
                        print(f"   ❌ Error response: {error_data}")
                        return False, {"error": "me endpoint failed", "status": me_response.status_code, "response": error_data}
                    except:
                        print(f"   ❌ Raw error response: {me_response.text[:300]}")
                        return False, {"error": "me endpoint failed", "status": me_response.status_code, "raw_response": me_response.text[:300]}
                        
            else:
                print(f"   ❌ Step 1: STARTER user login failed with status {login_response.status_code}")
                try:
                    error_data = login_response.json()
                    print(f"   ❌ Login error: {error_data}")
                    return False, {"error": "Login failed", "status": login_response.status_code, "response": error_data}
                except:
                    print(f"   ❌ Raw login error: {login_response.text[:300]}")
                    return False, {"error": "Login failed", "status": login_response.status_code, "raw_response": login_response.text[:300]}
                    
        except Exception as e:
            print(f"   ❌ Exception in STARTER user auth test: {e}")
            return False, {"error": "Exception occurred", "exception": str(e)}

if __name__ == "__main__":
    tester = StarterUserTester()
    
    print("🚀 Starting STARTER User Authentication Testing...")
    print(f"   Base URL: {tester.base_url}")
    print("   Focus: Testing startertest@demo.com /api/auth/me endpoint")
    print("   Issue: Frontend shows PRO features when database shows STARTER plan")
    
    # Run the specific STARTER user test
    print("\n" + "="*80)
    success, results = tester.test_starter_user_auth_me_endpoint()
    print("="*80)
    
    tester.tests_run = 1
    tester.tests_passed = 1 if success else 0
    
    print(f"\n📊 STARTER USER AUTH/ME TEST RESULTS:")
    print(f"   Test Status: {'✅ PASSED' if success else '❌ FAILED'}")
    
    if success:
        print(f"   ✅ Login Status: {'Successful' if results.get('login_successful') else 'Failed'}")
        print(f"   ✅ /api/auth/me Status: {'Successful' if results.get('me_endpoint_successful') else 'Failed'}")
        print(f"   ✅ User Email: {results.get('user_email')}")
        print(f"   ✅ User Plan: {results.get('user_plan')}")
        print(f"   ✅ Plan Correct: {'Yes' if results.get('plan_correct') else 'No'}")
        print(f"   ✅ Data Consistency: {'Yes' if results.get('consistency_check') else 'No'}")
        
        if results.get('plan_correct'):
            print("\n🎉 CONCLUSION: /api/auth/me returns correct STARTER plan")
            print("   The authentication API is working correctly.")
            print("   If frontend shows PRO features, the issue is in frontend logic.")
        else:
            print("\n🚨 CONCLUSION: /api/auth/me returns WRONG plan data")
            print("   This explains why frontend shows PRO features for STARTER user.")
            print("   The backend authentication system needs to be fixed.")
    else:
        print(f"\n❌ TEST FAILED:")
        if 'error' in results:
            print(f"   Error: {results['error']}")
        if 'exception' in results:
            print(f"   Exception: {results['exception']}")
        
        print("\n🔍 DEBUGGING INFO:")
        if 'login_response' in results:
            print(f"   Login Response: {json.dumps(results['login_response'], indent=2)}")
        if 'me_response' in results:
            print(f"   Me Response: {json.dumps(results['me_response'], indent=2)}")
    
    print(f"\n📈 Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if success:
        print("   🎉 Overall Status: SUCCESS")
        sys.exit(0)
    else:
        print("   ❌ Overall Status: FAILURE - Authentication issue confirmed")
        sys.exit(1)