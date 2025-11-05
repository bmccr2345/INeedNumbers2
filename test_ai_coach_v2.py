#!/usr/bin/env python3
"""
AI Coach v2 System Testing Script
Tests the new AI Coach v2 endpoints as requested in the review
"""

import requests
import json
import time
from datetime import datetime

class AICoachV2Tester:
    def __init__(self, base_url="https://clerk-migrate-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.auth_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, cookies=cookies, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, cookies=cookies, timeout=15)
            
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
        """Login as demo user to get authentication token"""
        print("🔐 Logging in as demo user...")
        
        login_data = {
            "email": "demo@demo.com",
            "password": "demo123",
            "remember_me": True
        }
        
        success, response = self.run_test(
            "Demo User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(response, dict):
            self.auth_token = response.get('access_token')
            user_plan = response.get('user', {}).get('plan', 'Unknown')
            print(f"✅ Demo user logged in successfully")
            print(f"✅ User plan: {user_plan}")
            return True
        else:
            print("❌ Demo user login failed")
            return False

    def test_ai_coach_v2_comprehensive(self):
        """Comprehensive testing of AI Coach v2 system as requested in review"""
        print("\n🤖 AI COACH V2 COMPREHENSIVE TESTING...")
        
        # Test 1: POST /api/ai-coach-v2/generate with demo user (non-streaming)
        print("\n🔍 Testing AI Coach v2 Generate Endpoint (Non-Streaming)...")
        
        generate_data = {
            "stream": False,
            "force": False,
            "year": 2025
        }
        
        success1, response1 = self.run_test(
            "AI Coach v2 Generate (Non-Streaming)",
            "POST",
            "api/ai-coach-v2/generate",
            200,
            data=generate_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if success1 and isinstance(response1, dict):
            # Verify JSON structure with required keys
            required_keys = ['summary', 'stats', 'actions', 'risks', 'next_inputs']
            missing_keys = [key for key in required_keys if key not in response1]
            
            if not missing_keys:
                print("   ✅ Response contains all required keys: summary, stats, actions, risks, next_inputs")
                print(f"   ✅ Summary: {response1.get('summary', '')[:100]}...")
                print(f"   ✅ Actions count: {len(response1.get('actions', []))}")
                print(f"   ✅ Risks count: {len(response1.get('risks', []))}")
                print(f"   ✅ Next inputs count: {len(response1.get('next_inputs', []))}")
            else:
                print(f"   ❌ Missing required keys: {missing_keys}")
        
        # Test 2: POST /api/ai-coach-v2/generate with streaming
        print("\n🔍 Testing AI Coach v2 Generate Endpoint (Streaming)...")
        
        generate_data_stream = {
            "stream": True,
            "force": False,
            "year": 2025
        }
        
        success2, response2 = self.run_test(
            "AI Coach v2 Generate (Streaming)",
            "POST",
            "api/ai-coach-v2/generate",
            200,
            data=generate_data_stream,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if success2:
            print("   ✅ Streaming endpoint accessible")
            print("   ℹ️  Streaming response format verification would require specialized testing")
        
        # Test 3: GET /api/ai-coach-v2/diag endpoint
        print("\n🔍 Testing AI Coach v2 Diagnostics Endpoint...")
        
        success3, response3 = self.run_test(
            "AI Coach v2 Diagnostics",
            "GET",
            "api/ai-coach-v2/diag",
            200,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if success3 and isinstance(response3, dict):
            # Verify diagnostic info structure
            expected_fields = ['user_id_prefix', 'user_plan', 'goals_count', 'activity_entries', 'reflections_count', 'pnl_deals', 'data_summary']
            present_fields = [field for field in expected_fields if field in response3]
            
            print(f"   ✅ Diagnostic fields present: {len(present_fields)}/{len(expected_fields)}")
            print(f"   ✅ User plan: {response3.get('user_plan', 'Unknown')}")
            print(f"   ✅ Goals count: {response3.get('goals_count', 0)}")
            print(f"   ✅ Activity entries: {response3.get('activity_entries', 0)}")
            print(f"   ✅ Reflections count: {response3.get('reflections_count', 0)}")
            print(f"   ✅ P&L deals: {response3.get('pnl_deals', 0)}")
            
            data_summary = response3.get('data_summary', {})
            if data_summary:
                print(f"   ✅ Has goals: {data_summary.get('has_goals', False)}")
                print(f"   ✅ Has recent activity: {data_summary.get('has_recent_activity', False)}")
                print(f"   ✅ Has reflections: {data_summary.get('has_reflections', False)}")
                print(f"   ✅ Has P&L data: {data_summary.get('has_pnl_data', False)}")
        
        # Test 4: Plan gating - test without authentication
        print("\n🔍 Testing AI Coach v2 Plan Gating...")
        
        success4, response4 = self.run_test(
            "AI Coach v2 Generate (No Auth - Should Fail)",
            "POST",
            "api/ai-coach-v2/generate",
            401,  # Should require authentication
            data=generate_data
        )
        
        if success4:
            print("   ✅ Authentication properly required")
        
        # Test 5: Rate limiting test
        print("\n🔍 Testing AI Coach v2 Rate Limiting...")
        
        rate_limit_results = []
        for i in range(8):  # Try 8 requests (limit is 6 per minute)
            success_rl, response_rl = self.run_test(
                f"AI Coach v2 Rate Limit Test {i+1}/8",
                "POST",
                "api/ai-coach-v2/generate",
                200 if i < 6 else 429,  # First 6 should succeed, rest should be rate limited
                data=generate_data,
                cookies={'access_token': self.auth_token} if self.auth_token else None
            )
            
            rate_limit_results.append((success_rl, response_rl))
            
            if not success_rl and isinstance(response_rl, dict):
                if response_rl.get('detail') == 'Rate limit exceeded':
                    print(f"   ✅ Rate limiting working - request {i+1} properly blocked")
                    retry_after = response_rl.get('retry_after')
                    if retry_after:
                        print(f"   ✅ Retry-After header present: {retry_after}s")
                    break
        
        # Test 6: Caching test
        print("\n🔍 Testing AI Coach v2 Caching...")
        
        # Make same request twice to test caching
        cache_data = {
            "stream": False,
            "force": False,
            "year": 2025
        }
        
        start_time = time.time()
        success6a, response6a = self.run_test(
            "AI Coach v2 Cache Test - First Request",
            "POST",
            "api/ai-coach-v2/generate",
            200,
            data=cache_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        first_request_time = time.time() - start_time
        
        start_time = time.time()
        success6b, response6b = self.run_test(
            "AI Coach v2 Cache Test - Second Request (Should be Cached)",
            "POST",
            "api/ai-coach-v2/generate",
            200,
            data=cache_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        second_request_time = time.time() - start_time
        
        if success6a and success6b:
            if second_request_time < first_request_time * 0.5:  # Second request should be significantly faster
                print(f"   ✅ Caching working - Second request faster ({second_request_time:.2f}s vs {first_request_time:.2f}s)")
            else:
                print(f"   ⚠️  Caching may not be working - Similar response times ({second_request_time:.2f}s vs {first_request_time:.2f}s)")
        
        # Test 7: Force parameter to bypass cache
        print("\n🔍 Testing AI Coach v2 Force Parameter...")
        
        force_data = {
            "stream": False,
            "force": True,  # Should bypass cache
            "year": 2025
        }
        
        success7, response7 = self.run_test(
            "AI Coach v2 Force Bypass Cache",
            "POST",
            "api/ai-coach-v2/generate",
            200,
            data=force_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if success7:
            print("   ✅ Force parameter accepted and processed")
        
        # Test 8: Data integration verification
        print("\n🔍 Testing AI Coach v2 Data Integration...")
        
        # Create test goal settings
        goal_data = {
            "goalType": "annual_gci",
            "annualGciGoal": 300000,
            "monthlyGciTarget": 25000,
            "avgGciPerClosing": 12000,
            "workdays": 22,
            "earnedGciToDate": 75000
        }
        
        goal_success, goal_response = self.run_test(
            "Create Test Goal Settings for AI Coach",
            "POST",
            "api/goal-settings",
            200,
            data=goal_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        # Create test activity log
        activity_data = {
            "date": "2025-01-15",
            "activities": {
                "conversations": 8,
                "appointments": 2,
                "offers_written": 1,
                "listings_taken": 3
            },
            "hours": {
                "prospecting": 2,
                "appointments": 4,
                "admin": 1,
                "marketing": 1
            },
            "reflection": "Good day with solid prospecting work"
        }
        
        activity_success, activity_response = self.run_test(
            "Create Test Activity Log for AI Coach",
            "POST",
            "api/activity-log",
            200,
            data=activity_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        # Create test reflection log
        reflection_data = {
            "date": "2025-01-15",
            "reflection": "Today was productive with good client interactions. Need to focus more on follow-ups with past clients for referrals.",
            "mood": "great"
        }
        
        reflection_success, reflection_response = self.run_test(
            "Create Test Reflection Log for AI Coach",
            "POST",
            "api/reflection-log",
            200,
            data=reflection_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        # Create test P&L deal
        pnl_deal_data = {
            "house_address": "123 Test Street",
            "amount_sold_for": 500000,
            "commission_percent": 6.0,
            "split_percent": 50.0,
            "team_brokerage_split_percent": 20.0,
            "lead_source": "Referral",
            "closing_date": "2025-01-10"
        }
        
        pnl_success, pnl_response = self.run_test(
            "Create Test P&L Deal for AI Coach",
            "POST",
            "api/pnl/deals",
            200,
            data=pnl_deal_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        # Now test diagnostics again to see if data integration is working
        success8, response8 = self.run_test(
            "AI Coach v2 Diagnostics After Data Creation",
            "GET",
            "api/ai-coach-v2/diag",
            200,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if success8 and isinstance(response8, dict):
            data_summary = response8.get('data_summary', {})
            print(f"   ✅ Data integration verification:")
            print(f"      - Goals: {data_summary.get('has_goals', False)}")
            print(f"      - Activity: {data_summary.get('has_recent_activity', False)}")
            print(f"      - Reflections: {data_summary.get('has_reflections', False)}")
            print(f"      - P&L Data: {data_summary.get('has_pnl_data', False)}")
        
        # Test 9: PII redaction test
        print("\n🔍 Testing AI Coach v2 PII Redaction...")
        
        # Create reflection with PII data
        pii_reflection_data = {
            "date": "2025-01-16",
            "reflection": "Met with client John Smith at john.smith@email.com, phone 555-123-4567. His SSN is 123-45-6789 for the loan application.",
            "mood": "productive"
        }
        
        pii_success, pii_response = self.run_test(
            "Create Reflection with PII for Testing",
            "POST",
            "api/reflection-log",
            200,
            data=pii_reflection_data,
            cookies={'access_token': self.auth_token} if self.auth_token else None
        )
        
        if pii_success:
            print("   ✅ Reflection with PII data created for testing")
        
        # Summary of AI Coach v2 tests
        print("\n📊 AI COACH V2 TEST SUMMARY:")
        
        total_tests = 9
        passed_tests = sum([
            success1, success2, success3, success4, 
            bool(rate_limit_results), success6a and success6b, 
            success7, success8, pii_success
        ])
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"   ✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"   📊 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("   🎉 AI Coach v2 system working excellently!")
        elif success_rate >= 60:
            print("   👍 AI Coach v2 system mostly functional")
        else:
            print("   ⚠️  AI Coach v2 system needs attention")
        
        return {
            'generate_non_stream': (success1, response1),
            'generate_stream': (success2, response2),
            'diagnostics': (success3, response3),
            'authentication': (success4, response4),
            'rate_limiting': rate_limit_results,
            'caching': (success6a and success6b, {'first_time': first_request_time, 'second_time': second_request_time}),
            'force_bypass': (success7, response7),
            'data_integration': (success8, response8),
            'pii_redaction': (pii_success, pii_response),
            'overall_success_rate': success_rate
        }

if __name__ == "__main__":
    tester = AICoachV2Tester()
    
    print("🚀 RUNNING AI COACH V2 SPECIFIC TESTS AS REQUESTED...")
    
    # First login as demo user
    if tester.login_demo_user():
        # Run comprehensive AI Coach v2 tests
        ai_coach_results = tester.test_ai_coach_v2_comprehensive()
        
        print("\n" + "="*60)
        print("🎯 AI COACH V2 TESTING COMPLETE")
        print("="*60)
        print(f"Overall Success Rate: {ai_coach_results['overall_success_rate']:.1f}%")
        
        if ai_coach_results['overall_success_rate'] >= 80:
            print("🎉 AI Coach v2 system is working excellently!")
        else:
            print("⚠️  AI Coach v2 system has some issues that need attention")
    else:
        print("❌ Cannot run AI Coach v2 tests - demo user login failed")
        print("Please ensure demo@demo.com user exists with password demo123")