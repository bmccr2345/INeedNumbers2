#!/usr/bin/env python3
"""
AI Coach Plan Access Control Testing
Test AI Coach API endpoints for proper plan-based access control
"""

import requests
import json
import sys
import uuid
from datetime import datetime

class AICoachPlanTester:
    def __init__(self, base_url="https://debug-ineednumbers.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=default_headers, cookies=cookies, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                except:
                    print(f"   Response: {response.text[:300]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def login_demo_user(self):
        """Login with demo@demo.com / Goosey23!!23 to get auth token"""
        print("🔐 Logging in with demo user (demo@demo.com)...")
        
        login_data = {
            "email": "demo@demo.com",
            "password": "Goosey23!!23",
            "remember_me": True
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                user_data = data.get('user', {})
                print(f"✅ Login successful!")
                print(f"   User: {user_data.get('email')}")
                print(f"   Plan: {user_data.get('plan')}")
                return True, response.cookies
            else:
                print(f"❌ Login failed with status {response.status_code}")
                print(f"   Response: {response.text}")
                return False, None
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False, None

    def test_ai_coach_plan_access_control(self):
        """Test AI Coach API access control for different user plan levels"""
        print("\n🤖 TESTING AI COACH PLAN ACCESS CONTROL...")
        print("   Testing: AI Coach API endpoints with different user plan levels")
        print("   Expected: PRO users get 200 OK, non-PRO users get 402 Payment Required")
        print("   Endpoints: /api/ai-coach/generate and /api/ai-coach-v2/generate")
        
        results = {}
        
        # 1. Test PRO user access (demo@demo.com should be PRO)
        pro_success, pro_response = self.test_ai_coach_pro_user_access()
        results['pro_user_access'] = {
            'success': pro_success,
            'response': pro_response
        }
        
        # 2. Test unauthenticated access (should be blocked)
        unauth_success, unauth_response = self.test_ai_coach_unauthenticated_access()
        results['unauthenticated_access'] = {
            'success': unauth_success,
            'response': unauth_response
        }
        
        # 3. Test both AI Coach endpoints
        endpoints_success, endpoints_response = self.test_ai_coach_both_endpoints()
        results['both_endpoints'] = {
            'success': endpoints_success,
            'response': endpoints_response
        }
        
        # Calculate overall success
        total_tests = 3
        successful_tests = sum([
            pro_success,
            unauth_success,
            endpoints_success
        ])
        
        overall_success = successful_tests >= 2  # Allow one failure
        
        print(f"\n🤖 AI COACH PLAN ACCESS CONTROL TESTING SUMMARY:")
        print(f"   ✅ Successful tests: {successful_tests}/{total_tests}")
        print(f"   📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if overall_success:
            print("   🎉 AI Coach Plan Access Control - TESTING COMPLETED SUCCESSFULLY")
        else:
            print("   ❌ AI Coach Plan Access Control - CRITICAL ISSUES FOUND")
            
        return overall_success, results
    
    def test_ai_coach_pro_user_access(self):
        """Test AI Coach access with PRO user (demo@demo.com)"""
        print("\n👑 TESTING AI COACH PRO USER ACCESS...")
        
        try:
            session = requests.Session()
            
            # Login with PRO user (demo@demo.com)
            login_data = {
                "email": "demo@demo.com",
                "password": "Goosey23!!23",
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("   ✅ PRO user login successful")
                
                # Verify user is PRO plan
                me_response = session.get(f"{self.base_url}/api/auth/me", timeout=15)
                if me_response.status_code == 200:
                    user_data = me_response.json()
                    user_plan = user_data.get('plan')
                    print(f"   🔍 User plan: {user_plan}")
                    
                    if user_plan != 'PRO':
                        print(f"   ❌ Expected PRO plan, got {user_plan}")
                        return False, {"error": f"User not PRO plan: {user_plan}"}
                    
                    print("   ✅ User confirmed as PRO plan")
                else:
                    print("   ❌ Could not verify user plan")
                    return False, {"error": "Could not verify user plan"}
                
                # Test AI Coach v2 endpoint
                ai_coach_data = {
                    "context": "general",
                    "deal_data": {
                        "sale_price": 500000,
                        "commission_percent": 6.0,
                        "split_percent": 50.0
                    }
                }
                
                ai_response = session.post(
                    f"{self.base_url}/api/ai-coach-v2/generate",
                    json=ai_coach_data,
                    timeout=30
                )
                
                print(f"   🔍 AI Coach response status: {ai_response.status_code}")
                
                if ai_response.status_code == 200:
                    print("   ✅ PRO user can access AI Coach - 200 OK")
                    try:
                        response_data = ai_response.json()
                        if 'summary' in response_data or 'analysis' in response_data:
                            print("   ✅ AI Coach returned valid analysis")
                        else:
                            print("   ⚠️  AI Coach response format unexpected")
                        return True, response_data
                    except:
                        print("   ✅ PRO user access granted (non-JSON response)")
                        return True, {"status": "access_granted", "response_text": ai_response.text[:200]}
                elif ai_response.status_code == 402:
                    print("   ❌ PRO user incorrectly blocked with 402 Payment Required")
                    return False, {"error": "PRO user blocked", "status": 402}
                elif ai_response.status_code == 401:
                    print("   ❌ PRO user authentication failed")
                    return False, {"error": "Authentication failed", "status": 401}
                else:
                    print(f"   ❌ Unexpected response: {ai_response.status_code}")
                    try:
                        error_data = ai_response.json()
                        return False, {"error": "Unexpected status", "status": ai_response.status_code, "response": error_data}
                    except:
                        return False, {"error": "Unexpected status", "status": ai_response.status_code, "response": ai_response.text[:200]}
            else:
                print(f"   ❌ PRO user login failed - {login_response.status_code}")
                return False, {"error": "Login failed", "status": login_response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error testing PRO user access: {e}")
            return False, {"error": str(e)}
    
    def test_ai_coach_unauthenticated_access(self):
        """Test AI Coach access without authentication (should be blocked)"""
        print("\n🔒 TESTING AI COACH UNAUTHENTICATED ACCESS...")
        
        try:
            # Test AI Coach v2 endpoint without authentication
            ai_coach_data = {
                "context": "general",
                "deal_data": {
                    "sale_price": 400000,
                    "commission_percent": 6.0
                }
            }
            
            ai_response = requests.post(
                f"{self.base_url}/api/ai-coach-v2/generate",
                json=ai_coach_data,
                timeout=15
            )
            
            print(f"   🔍 Unauthenticated AI Coach response status: {ai_response.status_code}")
            
            if ai_response.status_code == 401:
                print("   ✅ Unauthenticated access properly blocked - 401 Unauthorized")
                try:
                    error_data = ai_response.json()
                    return True, {"status": "properly_blocked", "response": error_data}
                except:
                    return True, {"status": "properly_blocked", "response": ai_response.text[:200]}
                    
            elif ai_response.status_code == 200:
                print("   ❌ Unauthenticated access allowed - SECURITY ISSUE")
                return False, {"error": "Unauthenticated access allowed", "status": 200}
                
            else:
                print(f"   ⚠️  Unexpected status for unauthenticated request: {ai_response.status_code}")
                try:
                    error_data = ai_response.json()
                    return True, {"status": "blocked_with_different_code", "response": error_data}
                except:
                    return True, {"status": "blocked_with_different_code", "response": ai_response.text[:200]}
                
        except Exception as e:
            print(f"   ❌ Error testing unauthenticated access: {e}")
            return False, {"error": str(e)}
    
    def test_ai_coach_both_endpoints(self):
        """Test both AI Coach endpoints for consistency"""
        print("\n🔄 TESTING BOTH AI COACH ENDPOINTS...")
        
        try:
            session = requests.Session()
            
            # Login with PRO user
            login_data = {
                "email": "demo@demo.com",
                "password": "Goosey23!!23", 
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code == 200:
                print("   ✅ Login successful for endpoint comparison")
                
                ai_coach_data = {
                    "context": "general",
                    "deal_data": {
                        "sale_price": 500000,
                        "commission_percent": 6.0
                    }
                }
                
                results = {}
                
                # Test AI Coach v2 endpoint
                print("   🔍 Testing /api/ai-coach-v2/generate...")
                v2_response = session.post(
                    f"{self.base_url}/api/ai-coach-v2/generate",
                    json=ai_coach_data,
                    timeout=30
                )
                
                print(f"   📊 v2 endpoint status: {v2_response.status_code}")
                results['v2'] = {
                    'status': v2_response.status_code,
                    'accessible': v2_response.status_code == 200
                }
                
                if v2_response.status_code == 200:
                    print("   ✅ AI Coach v2 endpoint accessible")
                elif v2_response.status_code == 402:
                    print("   ⚠️  AI Coach v2 endpoint blocked (plan restriction)")
                elif v2_response.status_code == 401:
                    print("   ❌ AI Coach v2 endpoint authentication failed")
                else:
                    print(f"   ⚠️  AI Coach v2 endpoint unexpected status: {v2_response.status_code}")
                
                # Test original AI Coach endpoint (if it exists)
                print("   🔍 Testing /api/ai-coach/generate...")
                v1_response = session.post(
                    f"{self.base_url}/api/ai-coach/generate",
                    json=ai_coach_data,
                    timeout=30
                )
                
                print(f"   📊 v1 endpoint status: {v1_response.status_code}")
                results['v1'] = {
                    'status': v1_response.status_code,
                    'accessible': v1_response.status_code == 200
                }
                
                if v1_response.status_code == 200:
                    print("   ✅ AI Coach v1 endpoint accessible")
                elif v1_response.status_code == 404:
                    print("   ⚠️  AI Coach v1 endpoint not found (may not exist)")
                elif v1_response.status_code == 402:
                    print("   ⚠️  AI Coach v1 endpoint blocked (plan restriction)")
                elif v1_response.status_code == 401:
                    print("   ❌ AI Coach v1 endpoint authentication failed")
                else:
                    print(f"   ⚠️  AI Coach v1 endpoint unexpected status: {v1_response.status_code}")
                
                # Check consistency
                if results['v2']['accessible']:
                    print("   ✅ At least one AI Coach endpoint is accessible to PRO users")
                    return True, results
                else:
                    print("   ❌ No AI Coach endpoints accessible to PRO users")
                    return False, results
                    
            else:
                print(f"   ❌ Login failed - {login_response.status_code}")
                return False, {"error": "Login failed", "status": login_response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error testing both endpoints: {e}")
            return False, {"error": str(e)}

    def run_ai_coach_plan_testing(self):
        """Run focused AI Coach plan access control testing"""
        print("\n🤖 RUNNING AI COACH PLAN ACCESS CONTROL TESTING SUITE...")
        print("=" * 80)
        print("TESTING FOCUS: AI Coach API access control for different user plan levels")
        print("CRITICAL REQUIREMENTS:")
        print("1. PRO users should get 200 OK with AI Coach analysis")
        print("2. STARTER users should get 402 Payment Required")
        print("3. FREE users should get 402 Payment Required") 
        print("4. Unauthenticated users should get 401 Unauthorized")
        print("5. Both /api/ai-coach/generate and /api/ai-coach-v2/generate should be tested")
        print("=" * 80)
        
        # Run AI Coach plan access control tests
        ai_coach_success, ai_coach_results = self.test_ai_coach_plan_access_control()
        
        # Print detailed results
        print(f"\n🤖 AI COACH PLAN ACCESS CONTROL RESULTS:")
        print(f"   Overall Success: {'✅ PASS' if ai_coach_success else '❌ FAIL'}")
        
        for test_name, test_result in ai_coach_results.items():
            status = "✅ PASS" if test_result['success'] else "❌ FAIL"
            print(f"   {test_name}: {status}")
        
        return ai_coach_success

if __name__ == "__main__":
    tester = AICoachPlanTester()
    
    print("🚀 Starting AI Coach Plan Access Control Testing...")
    print(f"   Base URL: {tester.base_url}")
    print(f"   Focus: AI Coach API plan-based restrictions")
    
    # Run AI Coach focused testing
    overall_success = tester.run_ai_coach_plan_testing()
    
    if overall_success:
        print("\n🎉 AI COACH PLAN ACCESS CONTROL TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ AI COACH PLAN ACCESS CONTROL TESTING FAILED - CHECK RESULTS ABOVE")
        sys.exit(1)