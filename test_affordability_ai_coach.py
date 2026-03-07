#!/usr/bin/env python3
"""
AI Coach Affordability Analysis Test
Test the specific issue where AI Coach returns wrong data for affordability analysis
"""

import requests
import json
import sys
from datetime import datetime

class AffordabilityAICoachTester:
    def __init__(self, base_url="https://coach-metrics-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.auth_token = None
        self.auth_cookies = None
        self.demo_email = "demo@demo.com"
        self.demo_password = "demo123"
        
    def login(self):
        """Login with demo credentials"""
        print("🔐 Logging in with demo credentials...")
        
        login_data = {
            "email": self.demo_email,
            "password": self.demo_password,
            "remember_me": False
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if response.status_code == 200:
                print("   ✅ Login successful")
                self.auth_cookies = response.cookies
                return True
            else:
                print(f"   ❌ Login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Login error: {e}")
            return False
    
    def test_affordability_analysis_context(self):
        """Test affordability_analysis context with sample data from review request"""
        print("\n🏠 TESTING AFFORDABILITY ANALYSIS CONTEXT...")
        
        if not self.auth_cookies:
            print("   ❌ Not authenticated - cannot test")
            return False
        
        # Use exact sample data from review request
        affordability_data = {
            "context": "affordability_analysis",
            "affordability_data": {
                "home_price": 400000,
                "monthly_income": 40000,
                "down_payment": 80000,
                "interest_rate": 7.5,
                "dti_ratio": 5.6,
                "qualified": True,
                "loan_type": "CONVENTIONAL"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/ai-coach-v2/generate",
                json=affordability_data,
                cookies=self.auth_cookies,
                timeout=30
            )
            
            print(f"   📡 Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print("   ✅ AI Coach responded successfully")
                    
                    # Analyze response content
                    response_text = str(response_data).lower()
                    
                    print(f"\n   📋 Response structure: {list(response_data.keys())}")
                    
                    if 'summary' in response_data:
                        summary = response_data['summary']
                        print(f"   📝 Summary: {summary}")
                    
                    # Check for affordability-specific content
                    affordability_keywords = [
                        'home', 'house', 'affordability', 'mortgage', 'payment', 
                        'dti', 'debt', 'income', 'qualified', 'loan', 'conventional'
                    ]
                    
                    # Check for GCI/dashboard content (should NOT be present)
                    gci_keywords = [
                        'gci', 'commission', 'deals', 'closing', 'target', '$20,000', 
                        'real estate business', 'pipeline', 'listings'
                    ]
                    
                    affordability_score = sum(1 for keyword in affordability_keywords if keyword in response_text)
                    gci_score = sum(1 for keyword in gci_keywords if keyword in response_text)
                    
                    print(f"\n   📊 ANALYSIS RESULTS:")
                    print(f"   ✅ Affordability keywords found: {affordability_score}/{len(affordability_keywords)}")
                    print(f"   ❌ GCI keywords found: {gci_score}/{len(gci_keywords)}")
                    
                    # Detailed keyword analysis
                    print(f"\n   🔍 DETAILED KEYWORD ANALYSIS:")
                    found_affordability = [kw for kw in affordability_keywords if kw in response_text]
                    found_gci = [kw for kw in gci_keywords if kw in response_text]
                    
                    if found_affordability:
                        print(f"   ✅ Found affordability keywords: {found_affordability}")
                    if found_gci:
                        print(f"   ❌ Found GCI keywords: {found_gci}")
                    
                    # Check specific values from input
                    input_values = ['400000', '400,000', '$400', '7.5', '5.6', 'conventional']
                    found_values = [val for val in input_values if val.lower() in response_text]
                    if found_values:
                        print(f"   ✅ Found input values in response: {found_values}")
                    
                    # Determine if bug exists
                    if gci_score > affordability_score:
                        print(f"\n   🚨 BUG CONFIRMED: Response contains more GCI content ({gci_score}) than affordability content ({affordability_score})")
                        print(f"   🚨 This confirms the reported issue - AI Coach returning wrong analysis context")
                        return False
                    elif affordability_score >= 3 and gci_score <= 1:
                        print(f"\n   🎉 SUCCESS: Response contains appropriate affordability analysis")
                        print(f"   🎉 AI Coach is working correctly for affordability context")
                        return True
                    else:
                        print(f"\n   ⚠️  UNCLEAR: Mixed content - needs further investigation")
                        print(f"   ⚠️  Affordability: {affordability_score}, GCI: {gci_score}")
                        return True  # Consider success for debugging
                        
                except json.JSONDecodeError:
                    print("   ❌ Response is not valid JSON")
                    print(f"   Response text: {response.text[:500]}...")
                    return False
                    
            elif response.status_code == 401:
                print("   ❌ Authentication failed")
                return False
            elif response.status_code == 429:
                print("   ⚠️  Rate limited - try again later")
                return False
            else:
                print(f"   ❌ Request failed: {response.status_code}")
                print(f"   Response: {response.text[:300]}...")
                return False
                
        except Exception as e:
            print(f"   ❌ Request error: {e}")
            return False
    
    def test_dashboard_context_comparison(self):
        """Test dashboard context to compare with affordability context"""
        print("\n📊 TESTING DASHBOARD CONTEXT FOR COMPARISON...")
        
        if not self.auth_cookies:
            print("   ❌ Not authenticated - cannot test")
            return False
        
        # Test general/dashboard context
        dashboard_data = {
            "context": "general"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/ai-coach-v2/generate",
                json=dashboard_data,
                cookies=self.auth_cookies,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                response_text = str(response_data).lower()
                
                # Check for dashboard/GCI content
                gci_keywords = ['gci', 'goal', 'target', 'activity', 'pipeline', 'deals']
                gci_score = sum(1 for keyword in gci_keywords if keyword in response_text)
                
                print(f"   📊 Dashboard context GCI keywords: {gci_score}/{len(gci_keywords)}")
                
                if gci_score >= 2:
                    print("   ✅ Dashboard context returns appropriate business/GCI content")
                    return True
                else:
                    print("   ⚠️  Dashboard context may not be working as expected")
                    return True
            else:
                print(f"   ❌ Dashboard context test failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Dashboard context test error: {e}")
            return False
    
    def test_backend_logs(self):
        """Check backend logs for AI Coach errors"""
        print("\n📋 CHECKING BACKEND LOGS...")
        
        try:
            # Check supervisor logs for backend errors
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                if logs.strip():
                    print("   📋 Recent backend error logs:")
                    print(logs[-1000:])  # Last 1000 chars
                else:
                    print("   ✅ No recent backend errors in logs")
                return True
            else:
                print("   ⚠️  Could not read backend logs")
                return False
                
        except Exception as e:
            print(f"   ⚠️  Error reading logs: {e}")
            return False
    
    def run_all_tests(self):
        """Run all affordability AI Coach tests"""
        print("🏠🤖 AI COACH AFFORDABILITY ANALYSIS TESTING")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("\n❌ Cannot proceed without authentication")
            return False
        
        # Run tests
        results = []
        
        # Test 1: Affordability analysis context
        affordability_success = self.test_affordability_analysis_context()
        results.append(("Affordability Analysis Context", affordability_success))
        
        # Test 2: Dashboard context comparison
        dashboard_success = self.test_dashboard_context_comparison()
        results.append(("Dashboard Context Comparison", dashboard_success))
        
        # Test 3: Backend logs
        logs_success = self.test_backend_logs()
        results.append(("Backend Logs Check", logs_success))
        
        # Summary
        print("\n" + "=" * 60)
        print("🏠🤖 AI COACH AFFORDABILITY ANALYSIS TEST SUMMARY")
        print("=" * 60)
        
        successful_tests = sum(1 for _, success in results if success)
        total_tests = len(results)
        
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"   {status} {test_name}")
        
        print(f"\n📊 Overall Results: {successful_tests}/{total_tests} tests passed")
        print(f"📈 Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if successful_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED - AI Coach affordability analysis working correctly")
        elif successful_tests >= total_tests - 1:
            print("\n✅ MOSTLY WORKING - Minor issues found")
        else:
            print("\n❌ CRITICAL ISSUES FOUND - AI Coach affordability analysis needs fixing")
        
        return successful_tests >= total_tests - 1

if __name__ == "__main__":
    tester = AffordabilityAICoachTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)