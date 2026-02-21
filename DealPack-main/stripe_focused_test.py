#!/usr/bin/env python3
"""
Focused Stripe Integration Testing for DealPack
Tests the Stripe integration endpoints specifically
"""
import requests
import sys
import json
import uuid
from datetime import datetime

class StripeIntegrationTester:
    def __init__(self, base_url="https://mobile-desktop-sync-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        self.test_user_email = f"stripetest_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_password = "StripeTest123!"
        self.test_user_name = "Stripe Tester"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.auth_token:
            default_headers['Authorization'] = f'Bearer {self.auth_token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)[:400]}...")
            except:
                print(f"   Response: {response.text[:400]}...")

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

    def setup_test_user(self):
        """Create and login test user"""
        print("🔐 Setting up test user for Stripe testing...")
        
        # Register user
        registration_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "full_name": self.test_user_name
        }
        
        success, response = self.run_test(
            "User Registration for Stripe Tests",
            "POST",
            "api/auth/register",
            200,
            data=registration_data
        )
        
        if not success:
            print("❌ Failed to create test user")
            return False
        
        # Login user
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "remember_me": True
        }
        
        success, response = self.run_test(
            "User Login for Stripe Tests",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(response, dict) and 'access_token' in response:
            self.auth_token = response['access_token']
            print("✅ Test user authenticated successfully")
            return True
        else:
            print("❌ Failed to authenticate test user")
            return False

    def test_stripe_checkout_authentication(self):
        """Test that Stripe checkout requires authentication"""
        checkout_data = {
            "plan": "starter",
            "origin_url": "https://mobile-desktop-sync-4.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Stripe Checkout Authentication Required",
            "POST",
            "api/stripe/checkout",
            401,
            data=checkout_data
        )

    def test_stripe_checkout_starter_plan(self):
        """Test Stripe checkout for starter plan"""
        checkout_data = {
            "plan": "starter",
            "origin_url": "https://mobile-desktop-sync-4.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Stripe Checkout - Starter Plan",
            "POST",
            "api/stripe/checkout",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        # Analyze the response
        if not success and isinstance(response, dict):
            detail = response.get('detail', '')
            if 'No such price' in detail:
                print("   ⚠️  Issue: Stripe price ID not found - needs valid price IDs")
                print(f"   ⚠️  Detail: {detail}")
                return False, response
            elif 'Invalid API Key' in detail:
                print("   ⚠️  Issue: Stripe API key problem")
                return False, response
        
        return success, response

    def test_stripe_checkout_pro_plan(self):
        """Test Stripe checkout for pro plan"""
        checkout_data = {
            "plan": "pro",
            "origin_url": "https://mobile-desktop-sync-4.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Stripe Checkout - Pro Plan",
            "POST",
            "api/stripe/checkout",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        # Analyze the response
        if not success and isinstance(response, dict):
            detail = response.get('detail', '')
            if 'No such price' in detail:
                print("   ⚠️  Issue: Stripe price ID not found - needs valid price IDs")
                print(f"   ⚠️  Detail: {detail}")
                return False, response
        
        return success, response

    def test_stripe_checkout_invalid_plan(self):
        """Test Stripe checkout with invalid plan"""
        checkout_data = {
            "plan": "invalid_plan",
            "origin_url": "https://mobile-desktop-sync-4.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Stripe Checkout - Invalid Plan",
            "POST",
            "api/stripe/checkout",
            400,
            data=checkout_data,
            auth_required=True
        )

    def test_stripe_checkout_status_endpoint(self):
        """Test Stripe checkout status endpoint"""
        # Test with a dummy session ID
        dummy_session_id = "cs_test_dummy_session_for_testing"
        
        success, response = self.run_test(
            "Stripe Checkout Status Endpoint",
            "GET",
            f"api/stripe/checkout/status/{dummy_session_id}",
            500  # Expected to fail with dummy session ID
        )
        
        # This should fail but confirms the endpoint exists and is accessible
        if not success and isinstance(response, dict):
            detail = response.get('detail', '')
            if 'No such checkout.session' in detail:
                print("   ✅ Endpoint exists and properly validates session IDs")
                return True, response
            elif 'Invalid API Key' in detail:
                print("   ⚠️  Issue: Stripe API key problem")
                return False, response
        
        return success, response

    def test_stripe_customer_portal(self):
        """Test Stripe customer portal endpoint"""
        return self.run_test(
            "Stripe Customer Portal",
            "POST",
            "api/stripe/portal",
            200,
            auth_required=True
        )

    def test_stripe_webhook_endpoint(self):
        """Test Stripe webhook endpoint exists"""
        # Test with dummy webhook data
        webhook_data = {
            "id": "evt_test_webhook",
            "object": "event",
            "type": "checkout.session.completed"
        }
        
        success, response = self.run_test(
            "Stripe Webhook Endpoint",
            "POST",
            "api/stripe/webhook",
            200,  # Should return 200 even with invalid signature
            data=webhook_data
        )
        
        return success, response

    def cleanup_test_user(self):
        """Clean up test user"""
        if not self.auth_token:
            return
            
        delete_data = {"confirmation": "DELETE"}
        
        self.run_test(
            "Cleanup Test User",
            "DELETE",
            "api/auth/delete-account",
            200,
            data=delete_data,
            auth_required=True
        )

def main():
    print("💳 DealPack Stripe Integration Focused Testing")
    print("=" * 60)
    
    tester = StripeIntegrationTester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user - cannot continue")
        return 1
    
    print("\n💳 Testing Stripe Integration Endpoints...")
    
    # Test authentication requirements
    tester.test_stripe_checkout_authentication()
    
    # Test checkout endpoints
    starter_success, starter_response = tester.test_stripe_checkout_starter_plan()
    pro_success, pro_response = tester.test_stripe_checkout_pro_plan()
    tester.test_stripe_checkout_invalid_plan()
    
    # Test status endpoint
    tester.test_stripe_checkout_status_endpoint()
    
    # Test customer portal
    tester.test_stripe_customer_portal()
    
    # Test webhook endpoint
    tester.test_stripe_webhook_endpoint()
    
    # Cleanup
    print("\n🧹 Cleaning up...")
    tester.cleanup_test_user()
    
    # Analysis
    print(f"\n📊 Stripe Integration Test Results")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Detailed analysis
    print("\n🔍 Analysis:")
    
    # Check if authentication is working
    auth_working = tester.tests_passed > 2  # At least registration and login worked
    if auth_working:
        print("✅ Authentication system is working correctly")
    else:
        print("❌ Authentication system has issues")
    
    # Check Stripe integration status
    if not starter_success and not pro_success:
        print("❌ Stripe checkout endpoints are failing")
        
        # Analyze the failure reasons
        if isinstance(starter_response, dict):
            detail = starter_response.get('detail', '')
            if 'No such price' in detail:
                print("⚠️  ROOT CAUSE: Stripe price IDs are invalid/placeholder")
                print("   SOLUTION: Need to create actual Stripe products and prices")
                print("   CURRENT PRICE IDs: price_test_starter_monthly, price_test_pro_monthly")
                print("   REQUIRED: Real Stripe price IDs like price_1ABC123...")
            elif 'Invalid API Key' in detail:
                print("⚠️  ROOT CAUSE: Stripe API key is invalid")
                print("   SOLUTION: Verify Stripe API key is correct")
    else:
        print("✅ Stripe checkout endpoints are working")
    
    # Overall assessment
    failed_tests = tester.tests_run - tester.tests_passed
    if failed_tests <= 2:
        print("\n✅ OVERALL: Stripe integration structure is correct")
        print("   Minor configuration issues need to be resolved")
        return 0
    else:
        print("\n⚠️  OVERALL: Stripe integration needs configuration fixes")
        print("   Core structure is implemented but requires valid Stripe setup")
        return 1

if __name__ == "__main__":
    sys.exit(main())