#!/usr/bin/env python3
"""
Focused test for /api/auth/me endpoint role data issue
Debug stale user role data problem
"""

import requests
import sys
import json
import base64
import time
from datetime import datetime

class AuthMeRoleTester:
    def __init__(self, base_url="https://debug-ineednumbers.preview.emergentagent.com"):
        self.base_url = base_url
        self.demo_email = "demo@demo.com"
        self.demo_password = "demo123"  # Correct password from previous tests
        
    def test_fresh_login_role_data(self):
        """Test fresh login and immediate /api/auth/me call to check role data"""
        print("\n🔄 TESTING FRESH LOGIN ROLE DATA...")
        
        try:
            session = requests.Session()
            
            # Step 1: Fresh login with demo credentials
            login_data = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            print(f"   🔑 Attempting fresh login with {self.demo_email}...")
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("   ✅ Fresh login successful")
                login_data_response = login_response.json()
                
                # Check if user data is returned in login response
                if 'user' in login_data_response:
                    login_user_role = login_data_response['user'].get('role', 'not_found')
                    print(f"   📋 Login response user role: {login_user_role}")
                else:
                    print("   ⚠️  No user data in login response")
                
                # Step 2: Immediate /api/auth/me call
                print("   🔍 Making immediate /api/auth/me call...")
                me_response = session.get(
                    f"{self.base_url}/api/auth/me",
                    timeout=15
                )
                
                if me_response.status_code == 200:
                    print("   ✅ /api/auth/me call successful")
                    me_data = me_response.json()
                    
                    # Extract role data
                    me_role = me_data.get('role', 'not_found')
                    me_email = me_data.get('email', 'not_found')
                    me_id = me_data.get('id', 'not_found')
                    
                    print(f"   📋 /api/auth/me response:")
                    print(f"      Email: {me_email}")
                    print(f"      Role: {me_role}")
                    print(f"      User ID: {me_id}")
                    print(f"      Full response keys: {list(me_data.keys())}")
                    
                    # Check for the specific issue
                    if me_role == 'master_admin':
                        print("   ✅ ROLE DATA CORRECT: /api/auth/me returns 'master_admin'")
                        return True, {
                            "login_role": login_data_response.get('user', {}).get('role'),
                            "me_role": me_role,
                            "status": "role_correct",
                            "me_response": me_data
                        }
                    elif me_role == 'user':
                        print("   ❌ STALE ROLE DATA CONFIRMED: /api/auth/me returns 'user' instead of 'master_admin'")
                        return False, {
                            "login_role": login_data_response.get('user', {}).get('role'),
                            "me_role": me_role,
                            "status": "stale_role_confirmed",
                            "me_response": me_data,
                            "issue": "API returns 'user' but should return 'master_admin'"
                        }
                    else:
                        print(f"   ⚠️  UNEXPECTED ROLE: /api/auth/me returns '{me_role}'")
                        return False, {
                            "login_role": login_data_response.get('user', {}).get('role'),
                            "me_role": me_role,
                            "status": "unexpected_role",
                            "me_response": me_data
                        }
                else:
                    print(f"   ❌ /api/auth/me failed with status {me_response.status_code}")
                    print(f"   📋 Response: {me_response.text[:200]}")
                    return False, {
                        "error": "auth_me_failed",
                        "status": me_response.status_code,
                        "response": me_response.text[:200]
                    }
            else:
                print(f"   ❌ Fresh login failed with status {login_response.status_code}")
                print(f"   📋 Response: {login_response.text[:200]}")
                return False, {
                    "error": "login_failed",
                    "status": login_response.status_code,
                    "response": login_response.text[:200]
                }
                
        except Exception as e:
            print(f"   ❌ Error in fresh login role test: {e}")
            return False, {"error": str(e)}
    
    def test_jwt_token_role_data(self):
        """Test JWT token contents to see if role data is embedded"""
        print("\n🎫 TESTING JWT TOKEN ROLE DATA...")
        
        try:
            # Login to get JWT token
            login_data = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            login_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("   ✅ Login successful for JWT analysis")
                
                # Try to extract JWT token from response or cookies
                jwt_token = None
                login_data_response = login_response.json()
                
                # Check if token is in response body
                if 'access_token' in login_data_response:
                    jwt_token = login_data_response['access_token']
                    print("   📋 JWT token found in response body")
                else:
                    # Check cookies for token
                    cookies = login_response.cookies
                    if 'access_token' in cookies:
                        jwt_token = cookies['access_token']
                        print("   📋 JWT token found in cookies")
                    else:
                        print("   ⚠️  JWT token not found in response or cookies")
                
                if jwt_token:
                    # Decode JWT token (without verification for analysis)
                    try:
                        # JWT has 3 parts: header.payload.signature
                        parts = jwt_token.split('.')
                        if len(parts) == 3:
                            # Decode payload (second part)
                            payload_encoded = parts[1]
                            # Add padding if needed
                            payload_encoded += '=' * (4 - len(payload_encoded) % 4)
                            payload_decoded = base64.b64decode(payload_encoded)
                            payload_json = json.loads(payload_decoded)
                            
                            print("   ✅ JWT token decoded successfully")
                            print(f"   📋 JWT payload keys: {list(payload_json.keys())}")
                            
                            # Check if role is in JWT payload
                            if 'role' in payload_json:
                                jwt_role = payload_json['role']
                                print(f"   📋 Role in JWT token: {jwt_role}")
                                
                                if jwt_role == 'master_admin':
                                    print("   ✅ JWT contains correct role: master_admin")
                                elif jwt_role == 'user':
                                    print("   ❌ JWT contains stale role: user")
                                else:
                                    print(f"   ⚠️  JWT contains unexpected role: {jwt_role}")
                            else:
                                print("   📋 No role data in JWT token payload")
                                print(f"   📋 JWT payload: {json.dumps(payload_json, indent=2)}")
                            
                            return True, {
                                "jwt_payload": payload_json,
                                "has_role": 'role' in payload_json,
                                "jwt_role": payload_json.get('role', 'not_found'),
                                "status": "jwt_decoded"
                            }
                        else:
                            print("   ❌ Invalid JWT token format")
                            return False, {"error": "invalid_jwt_format"}
                    except Exception as decode_error:
                        print(f"   ❌ Error decoding JWT token: {decode_error}")
                        return False, {"error": f"jwt_decode_error: {decode_error}"}
                else:
                    print("   ❌ No JWT token available for analysis")
                    return False, {"error": "no_jwt_token"}
            else:
                print(f"   ❌ Login failed for JWT analysis: {login_response.status_code}")
                return False, {"error": "login_failed_for_jwt"}
                
        except Exception as e:
            print(f"   ❌ Error in JWT token analysis: {e}")
            return False, {"error": str(e)}
    
    def test_multiple_auth_me_calls(self):
        """Test multiple /api/auth/me calls to check for consistency"""
        print("\n🔄 TESTING MULTIPLE AUTH ME CALLS...")
        
        try:
            session = requests.Session()
            
            # Login first
            login_data = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("   ✅ Login successful for consistency test")
                
                # Make multiple /api/auth/me calls to check for consistency
                role_responses = []
                
                for i in range(5):
                    me_response = session.get(
                        f"{self.base_url}/api/auth/me",
                        timeout=15
                    )
                    
                    if me_response.status_code == 200:
                        me_data = me_response.json()
                        role = me_data.get('role', 'not_found')
                        role_responses.append(role)
                        print(f"   📋 Call {i+1}: Role = {role}")
                    else:
                        print(f"   ❌ Call {i+1}: Failed with status {me_response.status_code}")
                        role_responses.append('error')
                    
                    time.sleep(0.2)  # Small delay between calls
                
                # Check consistency
                unique_roles = set(role_responses)
                if len(unique_roles) == 1:
                    consistent_role = list(unique_roles)[0]
                    print(f"   ✅ Role data is consistent across calls: {consistent_role}")
                    
                    if consistent_role == 'master_admin':
                        print("   ✅ Consistent role is correct: master_admin")
                        return True, {
                            "consistent": True,
                            "role": consistent_role,
                            "status": "correct_consistent_role"
                        }
                    elif consistent_role == 'user':
                        print("   ❌ Consistent role is stale: user (should be master_admin)")
                        return False, {
                            "consistent": True,
                            "role": consistent_role,
                            "status": "stale_consistent_role",
                            "issue": "API consistently returns 'user' but database likely has 'master_admin'"
                        }
                    else:
                        print(f"   ⚠️  Consistent role is unexpected: {consistent_role}")
                        return False, {
                            "consistent": True,
                            "role": consistent_role,
                            "status": "unexpected_consistent_role"
                        }
                else:
                    print(f"   ❌ Role data is INCONSISTENT across calls: {unique_roles}")
                    return False, {
                        "consistent": False,
                        "roles": list(unique_roles),
                        "status": "inconsistent_roles",
                        "issue": "Role data varies between API calls"
                    }
            else:
                print(f"   ❌ Login failed for consistency test: {login_response.status_code}")
                return False, {"error": "login_failed"}
                
        except Exception as e:
            print(f"   ❌ Error in consistency test: {e}")
            return False, {"error": str(e)}
    
    def run_all_tests(self):
        """Run all auth/me role data tests"""
        print("🔍👤 AUTH ME ENDPOINT ROLE DATA INVESTIGATION")
        print("=" * 80)
        print("INVESTIGATING: /api/auth/me endpoint returning stale user role data")
        print("ISSUE: Admin console access denied because AuthContext shows old role")
        print("DATABASE: demo user role changed from 'user' to 'master_admin'")
        print("FRONTEND: Shows 'Your role: user' (stale)")
        print("EXPECTED: Shows 'Your role: master_admin' (updated)")
        print("=" * 80)
        
        results = {}
        
        # Test 1: Fresh login and immediate /api/auth/me call
        fresh_login_success, fresh_login_response = self.test_fresh_login_role_data()
        results['fresh_login_role'] = {
            'success': fresh_login_success,
            'response': fresh_login_response
        }
        
        # Test 2: JWT token contents for role data
        jwt_role_success, jwt_role_response = self.test_jwt_token_role_data()
        results['jwt_token_role'] = {
            'success': jwt_role_success,
            'response': jwt_role_response
        }
        
        # Test 3: Multiple auth/me calls for consistency
        consistency_success, consistency_response = self.test_multiple_auth_me_calls()
        results['consistency'] = {
            'success': consistency_success,
            'response': consistency_response
        }
        
        # Calculate overall success
        total_tests = 3
        successful_tests = sum([
            fresh_login_success,
            jwt_role_success,
            consistency_success
        ])
        
        print(f"\n🎯 AUTH ME ROLE DATA TEST RESULTS:")
        print("=" * 60)
        
        # Print detailed findings
        if 'fresh_login_role' in results:
            fresh_result = results['fresh_login_role']
            if fresh_result['success']:
                print(f"\n✅ FRESH LOGIN TEST: {fresh_result['response'].get('status', 'completed')}")
                if 'me_role' in fresh_result['response']:
                    print(f"   📋 Current role returned by /api/auth/me: {fresh_result['response']['me_role']}")
            else:
                print(f"\n❌ FRESH LOGIN TEST FAILED: {fresh_result['response'].get('issue', 'unknown error')}")
        
        if 'jwt_token_role' in results:
            jwt_result = results['jwt_token_role']
            if jwt_result['success']:
                jwt_role = jwt_result['response'].get('jwt_role', 'not_found')
                has_role = jwt_result['response'].get('has_role', False)
                print(f"\n✅ JWT TOKEN TEST: Role in token = {jwt_role} (has_role: {has_role})")
            else:
                print(f"\n❌ JWT TOKEN TEST FAILED: {jwt_result['response'].get('error', 'unknown error')}")
        
        if 'consistency' in results:
            consistency_result = results['consistency']
            if consistency_result['success']:
                consistent_role = consistency_result['response'].get('role', 'unknown')
                print(f"\n✅ CONSISTENCY TEST: API consistently returns role = {consistent_role}")
            else:
                print(f"\n❌ CONSISTENCY TEST: {consistency_result['response'].get('issue', 'unknown error')}")
        
        print("\n" + "=" * 60)
        print("🔍 INVESTIGATION SUMMARY:")
        print(f"   📊 Tests completed: {successful_tests}/{total_tests}")
        print(f"   📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        # Determine the root cause based on test results
        if successful_tests >= 2:
            print("   📋 Investigation completed with sufficient data")
            print("   📋 Check individual test results above for role data status")
            
            # Specific diagnosis
            fresh_role = results.get('fresh_login_role', {}).get('response', {}).get('me_role')
            jwt_role = results.get('jwt_token_role', {}).get('response', {}).get('jwt_role')
            consistent_role = results.get('consistency', {}).get('response', {}).get('role')
            
            if fresh_role == 'master_admin':
                print("   ✅ DIAGNOSIS: /api/auth/me is returning the correct role 'master_admin'")
                print("   📋 The issue may be resolved or was a frontend caching issue")
            elif fresh_role == 'user':
                print("   ❌ DIAGNOSIS: /api/auth/me is returning stale role 'user'")
                print("   🔧 ROOT CAUSE: Backend authentication system is not reflecting database changes")
                if jwt_role == 'user':
                    print("   🔧 JWT token also contains stale role - token needs refresh or user data needs update")
                elif jwt_role == 'not_found':
                    print("   🔧 JWT token doesn't contain role data - role fetched from database on each request")
            else:
                print(f"   ⚠️  DIAGNOSIS: Unexpected role data: {fresh_role}")
        else:
            print("   ❌ Investigation incomplete due to test failures")
            print("   🔧 Main agent should check backend logs and authentication system")
        
        print("=" * 60)
        
        return results

if __name__ == "__main__":
    tester = AuthMeRoleTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code based on findings
    fresh_role = results.get('fresh_login_role', {}).get('response', {}).get('me_role')
    if fresh_role == 'master_admin':
        print("\n🎉 ISSUE RESOLVED: /api/auth/me returns correct role")
        sys.exit(0)
    elif fresh_role == 'user':
        print("\n❌ ISSUE CONFIRMED: /api/auth/me returns stale role")
        sys.exit(1)
    else:
        print("\n⚠️  INVESTIGATION INCOMPLETE: Unable to determine role status")
        sys.exit(2)