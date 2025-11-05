import requests
import sys
import json
import uuid
from datetime import datetime

class StripeIntegrationTester:
    def __init__(self, base_url="https://clerk-migrate-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        self.test_user_email = f"stripetest_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_password = "TestPassword123!"
        self.test_user_name = "Stripe Test User"
        self.checkout_session_ids = []

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
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=default_headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:500]}...")
                except:
                    print(f"   Response: {response.text[:300]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")

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
        print("\n🔐 Setting up test user...")
        
        # Register user
        registration_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "full_name": self.test_user_name
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=registration_data
        )
        
        if not success:
            print("❌ Failed to register test user")
            return False
        
        # Login user
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "remember_me": True
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(response, dict) and 'access_token' in response:
            self.auth_token = response['access_token']
            print("✅ Test user setup complete")
            return True
        else:
            print("❌ Failed to login test user")
            return False

    def test_stripe_checkout_starter(self):
        """Test Stripe checkout session creation for Starter plan"""
        checkout_data = {
            "plan": "starter",
            "origin_url": "https://clerk-migrate-fix.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Stripe Checkout (Starter Plan)",
            "POST",
            "api/stripe/checkout",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            if 'url' in response and 'session_id' in response:
                print("   ✅ Checkout response structure is correct")
                print(f"   ✅ Session ID: {response.get('session_id')}")
                print(f"   ✅ Checkout URL: {response.get('url')[:100]}...")
                self.checkout_session_ids.append(response.get('session_id'))
                
                # Verify URL is a valid Stripe checkout URL
                if 'checkout.stripe.com' in response.get('url', ''):
                    print("   ✅ Valid Stripe checkout URL returned")
                else:
                    print("   ⚠️  URL doesn't appear to be a Stripe checkout URL")
            else:
                print("   ❌ Checkout response structure is incorrect")
                
        return success, response

    def test_stripe_checkout_pro(self):
        """Test Stripe checkout session creation for Pro plan"""
        checkout_data = {
            "plan": "pro",
            "origin_url": "https://clerk-migrate-fix.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Stripe Checkout (Pro Plan)",
            "POST",
            "api/stripe/checkout",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            if 'url' in response and 'session_id' in response:
                print("   ✅ Checkout response structure is correct")
                print(f"   ✅ Session ID: {response.get('session_id')}")
                print(f"   ✅ Checkout URL: {response.get('url')[:100]}...")
                self.checkout_session_ids.append(response.get('session_id'))
                
                # Verify URL is a valid Stripe checkout URL
                if 'checkout.stripe.com' in response.get('url', ''):
                    print("   ✅ Valid Stripe checkout URL returned")
                else:
                    print("   ⚠️  URL doesn't appear to be a Stripe checkout URL")
            else:
                print("   ❌ Checkout response structure is incorrect")
                
        return success, response

    def test_stripe_checkout_invalid_plan(self):
        """Test Stripe checkout with invalid plan"""
        checkout_data = {
            "plan": "invalid_plan",
            "origin_url": "https://clerk-migrate-fix.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Stripe Checkout (Invalid Plan)",
            "POST",
            "api/stripe/checkout",
            400,
            data=checkout_data,
            auth_required=True
        )

    def test_stripe_checkout_no_auth(self):
        """Test Stripe checkout without authentication"""
        checkout_data = {
            "plan": "starter",
            "origin_url": "https://clerk-migrate-fix.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Stripe Checkout (No Auth)",
            "POST",
            "api/stripe/checkout",
            401,
            data=checkout_data
        )

    def test_stripe_checkout_status(self):
        """Test Stripe checkout status endpoint with real session ID"""
        if not self.checkout_session_ids:
            print("⚠️  No valid session IDs available for status testing")
            return False, {}
            
        session_id = self.checkout_session_ids[0]
        
        success, response = self.run_test(
            "Stripe Checkout Status (Real Session)",
            "GET",
            f"api/stripe/checkout/status/{session_id}",
            200
        )
        
        if success and isinstance(response, dict):
            if 'status' in response and 'payment_status' in response:
                print("   ✅ Status response structure is correct")
                print(f"   ✅ Session Status: {response.get('status')}")
                print(f"   ✅ Payment Status: {response.get('payment_status')}")
                print(f"   ✅ Amount Total: {response.get('amount_total')}")
                print(f"   ✅ Currency: {response.get('currency')}")
            else:
                print("   ❌ Status response structure is incorrect")
                
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

    def cleanup_test_user(self):
        """Delete the test user"""
        if not self.auth_token:
            return
            
        delete_data = {"confirmation": "DELETE"}
        
        success, response = self.run_test(
            "Cleanup - Delete Test User",
            "DELETE",
            "api/auth/delete-account",
            200,
            data=delete_data,
            auth_required=True
        )
        
        if success:
            print("✅ Test user cleanup complete")
        else:
            print("⚠️  Failed to cleanup test user")

def main():
    print("💳 Stripe Integration Testing Suite")
    print("=" * 60)
    
    # Initialize tester
    tester = StripeIntegrationTester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user. Exiting.")
        return 1
    
    # Test Stripe integration
    print("\n💳 Testing Stripe Integration...")
    tester.test_stripe_checkout_starter()
    tester.test_stripe_checkout_pro()
    tester.test_stripe_checkout_invalid_plan()
    tester.test_stripe_checkout_no_auth()
    tester.test_stripe_checkout_status()
    tester.test_stripe_customer_portal()
    
    # Cleanup
    print("\n🧹 Cleanup...")
    tester.cleanup_test_user()
    
    # Print final results
    print(f"\n📊 Stripe Integration Test Results")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Detailed analysis
    failed_tests = tester.tests_run - tester.tests_passed
    if failed_tests == 0:
        print("🎉 All Stripe integration tests passed!")
        return 0
    else:
        print(f"⚠️  {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())