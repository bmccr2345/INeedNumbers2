#!/usr/bin/env python3
"""
P&L API Validation Test
Test the specific issue with P&L endpoints returning 422 validation errors
"""

import requests
import json
import sys
from datetime import datetime

class PnLAPITester:
    def __init__(self):
        self.base_url = "https://realestate-numbers.preview.emergentagent.com"
        self.session = requests.Session()
        self.demo_email = "demo@demo.com"
        self.demo_password = "demo123"
        self.authenticated = False
        
    def authenticate(self):
        """Authenticate with demo user using cookie-based auth"""
        print("🔐 Authenticating with demo user...")
        
        login_data = {
            "email": self.demo_email,
            "password": self.demo_password,
            "remember_me": False
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('success'):
                    print("✅ Authentication successful (cookie-based)")
                    self.authenticated = True
                    return True
                else:
                    print("❌ Authentication failed - no success flag")
                    return False
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def test_pnl_endpoints_validation(self):
        """Test P&L endpoints for validation errors"""
        print("\n💰 TESTING P&L ENDPOINTS VALIDATION...")
        
        if not self.authenticated:
            print("❌ Cannot test without authentication")
            return False
            
        headers = {
            'Content-Type': 'application/json'
        }
        
        results = {}
        
        # Test 1: /api/pnl/deals without month parameter (should return 422)
        print("\n🔍 Testing /api/pnl/deals without month parameter...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/deals",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 422:
                print("✅ Correctly returns 422 validation error without month parameter")
                results['deals_no_month'] = {'status': 422, 'correct': True}
            else:
                print(f"❌ Expected 422, got {response.status_code}")
                results['deals_no_month'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing deals endpoint: {e}")
            results['deals_no_month'] = {'error': str(e)}
        
        # Test 2: /api/pnl/expenses without month parameter (should return 422)
        print("\n🔍 Testing /api/pnl/expenses without month parameter...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/expenses",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 422:
                print("✅ Correctly returns 422 validation error without month parameter")
                results['expenses_no_month'] = {'status': 422, 'correct': True}
            else:
                print(f"❌ Expected 422, got {response.status_code}")
                results['expenses_no_month'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing expenses endpoint: {e}")
            results['expenses_no_month'] = {'error': str(e)}
        
        # Test 3: /api/pnl/deals with month parameter (should return 200)
        current_month = "2025-01"
        print(f"\n🔍 Testing /api/pnl/deals with month parameter ({current_month})...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/deals?month={current_month}",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 200:
                print("✅ Works correctly with month parameter")
                results['deals_with_month'] = {'status': 200, 'correct': True}
            else:
                print(f"❌ Expected 200, got {response.status_code}")
                results['deals_with_month'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing deals endpoint with month: {e}")
            results['deals_with_month'] = {'error': str(e)}
        
        # Test 4: /api/pnl/expenses with month parameter (should return 200)
        print(f"\n🔍 Testing /api/pnl/expenses with month parameter ({current_month})...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/expenses?month={current_month}",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 200:
                print("✅ Works correctly with month parameter")
                results['expenses_with_month'] = {'status': 200, 'correct': True}
            else:
                print(f"❌ Expected 200, got {response.status_code}")
                results['expenses_with_month'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing expenses endpoint with month: {e}")
            results['expenses_with_month'] = {'error': str(e)}
        
        # Test 5: Verify /api/auth/me still works (authentication check)
        print("\n🔍 Testing /api/auth/me (authentication verification)...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/auth/me",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Authentication working correctly")
                results['auth_me'] = {'status': 200, 'correct': True}
            else:
                print(f"❌ Authentication issue: {response.status_code}")
                results['auth_me'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing auth endpoint: {e}")
            results['auth_me'] = {'error': str(e)}
        
        # Test 6: Test /api/pnl/summary with month parameter (should work)
        print(f"\n🔍 Testing /api/pnl/summary with month parameter ({current_month})...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/summary?month={current_month}",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 200:
                print("✅ P&L summary works correctly with month parameter")
                results['summary_with_month'] = {'status': 200, 'correct': True}
            else:
                print(f"❌ P&L summary issue: {response.status_code}")
                results['summary_with_month'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing summary endpoint: {e}")
            results['summary_with_month'] = {'error': str(e)}
        
        # Test 7: Test /api/pnl/categories (should work without month parameter)
        print("\n🔍 Testing /api/pnl/categories (should not require month parameter)...")
        try:
            response = self.session.get(
                f"{self.base_url}/api/pnl/categories",
                headers=headers,
                timeout=15
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            
            if response.status_code == 200:
                print("✅ Categories endpoint works correctly")
                results['categories'] = {'status': 200, 'correct': True}
            else:
                print(f"❌ Categories endpoint issue: {response.status_code}")
                results['categories'] = {'status': response.status_code, 'correct': False}
                
        except Exception as e:
            print(f"❌ Error testing categories endpoint: {e}")
            results['categories'] = {'error': str(e)}
        
        return results
    
    def run_tests(self):
        """Run all P&L API validation tests"""
        print("🚀 P&L API VALIDATION TESTING")
        print("=" * 50)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Run validation tests
        results = self.test_pnl_endpoints_validation()
        
        # Summary
        print("\n📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        total_tests = len(results)
        successful_tests = sum(1 for result in results.values() 
                             if isinstance(result, dict) and result.get('correct', False))
        
        print(f"Total tests: {total_tests}")
        print(f"Successful tests: {successful_tests}")
        print(f"Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        print("\nDetailed Results:")
        for test_name, result in results.items():
            if isinstance(result, dict):
                if result.get('correct', False):
                    print(f"✅ {test_name}: Status {result.get('status', 'N/A')}")
                else:
                    print(f"❌ {test_name}: Status {result.get('status', 'N/A')}")
            else:
                print(f"❌ {test_name}: Error - {result}")
        
        # Analysis
        print("\n🔍 ANALYSIS")
        print("=" * 50)
        
        deals_no_month = results.get('deals_no_month', {})
        expenses_no_month = results.get('expenses_no_month', {})
        deals_with_month = results.get('deals_with_month', {})
        expenses_with_month = results.get('expenses_with_month', {})
        
        if (deals_no_month.get('status') == 422 and 
            expenses_no_month.get('status') == 422 and
            deals_with_month.get('status') == 200 and
            expenses_with_month.get('status') == 200):
            
            print("✅ ISSUE CONFIRMED: P&L endpoints require month parameter")
            print("✅ SOLUTION IDENTIFIED: Frontend needs to provide month parameter")
            print("\nRecommendations:")
            print("1. Frontend should call /api/pnl/deals?month=YYYY-MM")
            print("2. Frontend should call /api/pnl/expenses?month=YYYY-MM")
            print("3. Default to current month if no month is specified in UI")
            print("4. Consider making month parameter optional with default to current month")
            
        else:
            print("⚠️  Results don't match expected pattern")
            print("Further investigation may be needed")
        
        return results

if __name__ == "__main__":
    tester = PnLAPITester()
    results = tester.run_tests()
    
    # Exit with appropriate code
    if results:
        sys.exit(0)
    else:
        sys.exit(1)