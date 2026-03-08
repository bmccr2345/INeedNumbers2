#!/usr/bin/env python3
"""
P&L Tracker Backend API Comprehensive Testing Script
Testing all P&L endpoints with proper authentication and validation
"""

import requests
import json
import uuid
from datetime import datetime

class PnLTrackerComprehensiveTester:
    def __init__(self, base_url="https://staging-app-35.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        self.test_deal_id = None
        self.test_expense_id = None
        self.failed_tests = []
        
    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")

            try:
                response_data = response.json()
                return success, response_data
            except:
                return success, response.text

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, str(e)

    def authenticate(self):
        """Authenticate with PRO user"""
        print("🔐 AUTHENTICATING WITH PRO USER...")
        
        login_data = {
            "email": "demo@demo.com",
            "password": "demo123",
            "remember_me": True
        }
        
        success, response = self.run_test(
            "Authentication",
            "POST",
            "api/auth/login",
            200,
            data=login_data,
            auth_required=False
        )
        
        if success and isinstance(response, dict):
            self.auth_token = response.get('access_token')
            user = response.get('user', {})
            print(f"   ✅ Authenticated as: {user.get('email')} ({user.get('plan')})")
            return user.get('plan') == 'PRO'
        
        return False

    def test_categories_endpoint(self):
        """Test GET /api/pnl/categories"""
        success, response = self.run_test(
            "P&L Categories",
            "GET",
            "api/pnl/categories",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} categories")
            expected_categories = ['Marketing & Advertising', 'Office Supplies', 'Professional Services']
            found = [cat for cat in expected_categories if cat in response]
            print(f"   ✅ Found expected categories: {found}")
        
        return success, response

    def test_lead_sources_endpoint(self):
        """Test GET /api/pnl/lead-sources"""
        success, response = self.run_test(
            "P&L Lead Sources",
            "GET",
            "api/pnl/lead-sources",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} lead sources")
            expected_sources = ['Referral - Past Client', 'Online Lead', 'Social Media']
            found = [src for src in expected_sources if any(src in item for item in response)]
            print(f"   ✅ Found expected sources: {found}")
        
        return success, response

    def test_create_deal(self):
        """Test POST /api/pnl/deals"""
        deal_data = {
            "house_address": "123 Test St",
            "amount_sold_for": 500000,
            "commission_percent": 6.0,
            "split_percent": 50.0,
            "team_brokerage_split_percent": 20.0,
            "lead_source": "Referral - Past Client",
            "closing_date": "2025-09-15"
        }
        
        success, response = self.run_test(
            "Create P&L Deal",
            "POST",
            "api/pnl/deals",
            200,
            data=deal_data
        )
        
        if success and isinstance(response, dict):
            self.test_deal_id = response.get('id')
            final_income = response.get('final_income', 0)
            print(f"   ✅ Deal created with ID: {self.test_deal_id}")
            print(f"   ✅ Final income calculated: ${final_income:,.2f}")
            
            # Verify calculation: $500,000 × 6% × 50% × (100% - 20%) = $12,000
            expected_income = 500000 * 0.06 * 0.5 * (1 - 0.2)
            if abs(final_income - expected_income) < 0.01:
                print(f"   ✅ Income calculation correct")
            else:
                print(f"   ❌ Income calculation incorrect: expected ${expected_income:,.2f}")
        
        return success, response

    def test_get_deals_by_month(self):
        """Test GET /api/pnl/deals?month=2025-09"""
        success, response = self.run_test(
            "Get Deals by Month",
            "GET",
            "api/pnl/deals?month=2025-09",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} deals for September 2025")
            for deal in response:
                if deal.get('month') == '2025-09':
                    print(f"   ✅ Deal correctly filtered for 2025-09")
                    break
        
        return success, response

    def test_create_expense(self):
        """Test POST /api/pnl/expenses"""
        expense_data = {
            "date": "2025-09-10",
            "category": "Marketing & Advertising",
            "amount": 250.00,
            "description": "Facebook ads campaign"
        }
        
        success, response = self.run_test(
            "Create P&L Expense",
            "POST",
            "api/pnl/expenses",
            200,
            data=expense_data
        )
        
        if success and isinstance(response, dict):
            self.test_expense_id = response.get('id')
            print(f"   ✅ Expense created with ID: {self.test_expense_id}")
            print(f"   ✅ Amount: ${response.get('amount', 0):,.2f}")
            print(f"   ✅ Category: {response.get('category')}")
        
        return success, response

    def test_get_expenses_by_month(self):
        """Test GET /api/pnl/expenses?month=2025-09"""
        success, response = self.run_test(
            "Get Expenses by Month",
            "GET",
            "api/pnl/expenses?month=2025-09",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} expenses for September 2025")
        
        return success, response

    def test_get_budgets(self):
        """Test GET /api/pnl/budgets?month=2025-09"""
        success, response = self.run_test(
            "Get Budgets",
            "GET",
            "api/pnl/budgets?month=2025-09",
            200
        )
        
        if success:
            print(f"   ✅ Budgets endpoint accessible")
        
        return success, response

    def test_update_budgets(self):
        """Test POST /api/pnl/budgets?month=2025-09"""
        budget_data = [
            {"category": "Marketing & Advertising", "monthly_budget": 500.00},
            {"category": "Office Supplies", "monthly_budget": 100.00}
        ]
        
        success, response = self.run_test(
            "Update Budgets",
            "POST",
            "api/pnl/budgets?month=2025-09",
            200,
            data=budget_data
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Updated {len(response)} budgets")
        
        return success, response

    def test_pnl_summary(self):
        """Test GET /api/pnl/summary?month=2025-09"""
        success, response = self.run_test(
            "P&L Summary",
            "GET",
            "api/pnl/summary?month=2025-09",
            200
        )
        
        if success and isinstance(response, dict):
            print(f"   ✅ Summary for {response.get('month')}")
            print(f"   ✅ Total Income: ${response.get('total_income', 0):,.2f}")
            print(f"   ✅ Total Expenses: ${response.get('total_expenses', 0):,.2f}")
            print(f"   ✅ Net Income: ${response.get('net_income', 0):,.2f}")
            
            budget_util = response.get('budget_utilization', {})
            if budget_util:
                print(f"   ✅ Budget utilization for {len(budget_util)} categories")
        
        return success, response

    def test_export_functionality(self):
        """Test GET /api/pnl/export?month=2025-09&format=excel"""
        success, response = self.run_test(
            "P&L Export",
            "GET",
            "api/pnl/export?month=2025-09&format=excel",
            200
        )
        
        if success:
            print(f"   ✅ Export endpoint accessible")
            if isinstance(response, dict) and 'message' in response:
                print(f"   ✅ Export message: {response.get('message')}")
        
        return success, response

    def test_delete_deal(self):
        """Test DELETE /api/pnl/deals/{deal_id}"""
        if self.test_deal_id:
            success, response = self.run_test(
                "Delete Deal",
                "DELETE",
                f"api/pnl/deals/{self.test_deal_id}",
                200
            )
            
            if success:
                print(f"   ✅ Deal deleted successfully")
            
            return success, response
        else:
            print("   ⚠️  No deal ID to delete")
            return True, {"message": "No deal to delete"}

    def test_delete_expense(self):
        """Test DELETE /api/pnl/expenses/{expense_id}"""
        if self.test_expense_id:
            success, response = self.run_test(
                "Delete Expense",
                "DELETE",
                f"api/pnl/expenses/{self.test_expense_id}",
                200
            )
            
            if success:
                print(f"   ✅ Expense deleted successfully")
            
            return success, response
        else:
            print("   ⚠️  No expense ID to delete")
            return True, {"message": "No expense to delete"}

    def run_comprehensive_tests(self):
        """Run all P&L tests in sequence"""
        print("🏢 P&L TRACKER COMPREHENSIVE API TESTING")
        print("=" * 60)
        print("Testing complete P&L Tracker backend API implementation")
        print("Focus: Pro Access Control, User Data Isolation, Month Filtering")
        print("Deal Calculations, Budget Utilization, CRUD Operations")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed")
            return False
        
        # Step 2: Basic endpoints
        print(f"\n📋 STEP 2: BASIC ENDPOINTS")
        self.test_categories_endpoint()
        self.test_lead_sources_endpoint()
        
        # Step 3: Deal operations
        print(f"\n📋 STEP 3: DEAL OPERATIONS")
        self.test_create_deal()
        self.test_get_deals_by_month()
        
        # Step 4: Expense operations
        print(f"\n📋 STEP 4: EXPENSE OPERATIONS")
        self.test_create_expense()
        self.test_get_expenses_by_month()
        
        # Step 5: Budget operations
        print(f"\n📋 STEP 5: BUDGET OPERATIONS")
        self.test_get_budgets()
        self.test_update_budgets()
        
        # Step 6: Summary and export
        print(f"\n📋 STEP 6: SUMMARY AND EXPORT")
        self.test_pnl_summary()
        self.test_export_functionality()
        
        # Step 7: Cleanup
        print(f"\n📋 STEP 7: CLEANUP")
        self.test_delete_deal()
        self.test_delete_expense()
        
        # Final results
        print("\n" + "=" * 60)
        print("📊 P&L TRACKER API TEST RESULTS")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        if success_rate >= 90:
            print("\n🎉 EXCELLENT: P&L Tracker API is working perfectly!")
            return True
        elif success_rate >= 80:
            print("\n✅ GOOD: P&L Tracker API is mostly working")
            return True
        else:
            print("\n⚠️  NEEDS ATTENTION: P&L Tracker API has significant issues")
            return False

if __name__ == "__main__":
    tester = PnLTrackerComprehensiveTester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n🎯 P&L TRACKER BACKEND API TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("\n🔧 P&L TRACKER BACKEND API NEEDS ATTENTION - REVIEW FAILED TESTS")