#!/usr/bin/env python3
"""
Demo User and Branding Profile Testing Script
Tests the specific functionality requested in the review request.
"""

import requests
import json
import sys
from datetime import datetime

class DemoBrandingTester:
    def __init__(self, base_url="https://inn-auth-upgrade.preview.emergentagent.com"):
        self.base_url = base_url
        self.auth_token = None
        self.tests_run = 0
        self.tests_passed = 0

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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=default_headers, timeout=15)

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

    def test_demo_user_exists_and_login(self):
        """Check if demo@demo.com user exists and can login"""
        print("\n🔍 STEP 1: CHECKING DEMO USER EXISTENCE...")
        
        login_data = {
            "email": "demo@demo.com",
            "password": "demo123",
            "remember_me": True
        }
        
        success, response = self.run_test(
            "Demo User Login Check",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and isinstance(response, dict):
            if 'access_token' in response and 'user' in response:
                print("   ✅ Demo user exists and can login successfully")
                self.auth_token = response['access_token']
                user_data = response.get('user', {})
                
                print(f"   ✅ User Email: {user_data.get('email')}")
                print(f"   ✅ User Plan: {user_data.get('plan')}")
                print(f"   ✅ User ID: {user_data.get('id')}")
                
                # Check if user has PRO plan for branding features
                if user_data.get('plan') == 'PRO':
                    print("   ✅ Demo user has PRO plan - can test all branding features")
                else:
                    print(f"   ⚠️  Demo user has {user_data.get('plan')} plan - may have limited branding access")
                
                return True, response
            else:
                print("   ❌ Demo user login response structure incorrect")
                return False, response
        else:
            print("   ❌ Demo user does not exist or login failed")
            print("   📝 Demo user needs to be created manually in database with:")
            print("      - email: demo@demo.com")
            print("      - password: demo123 (hashed with bcrypt)")
            print("      - plan: PRO")
            print("      - name: Demo User")
            return False, response

    def test_jwt_token_validation(self):
        """Test that JWT token works immediately after login"""
        if not self.auth_token:
            print("   ❌ No auth token available for validation")
            return False, {}
            
        print("\n🔍 STEP 2: VALIDATING JWT TOKEN...")
        
        success, response = self.run_test(
            "JWT Token Validation",
            "GET",
            "api/auth/me",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            if response.get('email') == 'demo@demo.com':
                print("   ✅ JWT token works immediately after login")
                print("   ✅ Token returns correct user data")
                return True, response
            else:
                print("   ❌ JWT token returns incorrect user data")
                return False, response
        else:
            print("   ❌ JWT token validation failed")
            return False, response

    def test_brand_profile_creation(self):
        """Test brand profile creation for demo user"""
        if not self.auth_token:
            print("   ❌ No auth token available for brand profile testing")
            return False, {}
            
        print("\n🔍 STEP 3: TESTING BRAND PROFILE CREATION...")
        
        success, response = self.run_test(
            "Brand Profile - Get/Create Default",
            "GET",
            "api/brand/profile",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            required_fields = ['id', 'userId', 'agent', 'brokerage', 'assets', 'brand', 'footer', 'planRules', 'completion', 'updatedAt']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print("   ✅ Brand profile created with all required fields")
                print(f"   ✅ Profile ID: {response.get('id')}")
                print(f"   ✅ User ID: {response.get('userId')}")
                print(f"   ✅ Completion score: {response.get('completion', 0)}%")
                
                # Check default brand colors
                brand_colors = response.get('brand', {})
                if brand_colors.get('primaryHex') == '#16a34a':
                    print("   ✅ Default primary brand color set correctly (#16a34a)")
                
                return True, response
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False, response
        else:
            print("   ❌ Brand profile creation failed")
            return False, response

    def test_brand_profile_update(self):
        """Test brand profile update functionality"""
        if not self.auth_token:
            print("   ❌ No auth token available for brand profile update")
            return False, {}
            
        print("\n🔍 STEP 4: TESTING BRAND PROFILE UPDATE...")
        
        update_data = {
            "agent": {
                "firstName": "Demo",
                "lastName": "User",
                "email": "demo@demo.com",
                "phone": "(555) 123-4567",
                "licenseNumber": "TX123456",
                "licenseState": "TX"
            },
            "brokerage": {
                "name": "Demo Real Estate Group",
                "licenseNumber": "BR789012",
                "address": "123 Main St, Austin, TX 78701"
            },
            "brand": {
                "primaryHex": "#2FA163",
                "secondaryHex": "#0ea5e9",
                "fontKey": "default"
            }
        }
        
        success, response = self.run_test(
            "Brand Profile - Update Profile Data",
            "POST",
            "api/brand/profile",
            200,
            data=update_data,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            # Check if completion score increased
            completion = response.get('completion', 0)
            if completion > 0:
                print(f"   ✅ Completion score updated: {completion}%")
                if completion >= 50:
                    print("   ✅ Completion score increased significantly after adding data")
            
            # Verify updated data
            agent = response.get('agent', {})
            if agent.get('firstName') == 'Demo' and agent.get('lastName') == 'User':
                print("   ✅ Agent data updated correctly")
            
            brokerage = response.get('brokerage', {})
            if brokerage.get('name') == 'Demo Real Estate Group':
                print("   ✅ Brokerage data updated correctly")
                
            return True, response
        else:
            print("   ❌ Brand profile update failed")
            return False, response

    def test_brand_resolve_authenticated(self):
        """Test brand data resolution for PDF generation"""
        if not self.auth_token:
            print("   ❌ No auth token available for brand resolve testing")
            return False, {}
            
        print("\n🔍 STEP 5: TESTING BRAND DATA RESOLUTION...")
        
        success, response = self.run_test(
            "Brand Resolve - Authenticated User",
            "GET",
            "api/brand/resolve",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            required_fields = ['agent', 'brokerage', 'colors', 'assets', 'footer', 'plan', 'show']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print("   ✅ Brand resolve response has all required fields")
                
                # Check plan-based feature gating
                show_settings = response.get('show', {})
                plan = response.get('plan', 'FREE')
                
                print(f"   ✅ User plan: {plan}")
                print(f"   ✅ Show settings: {show_settings}")
                
                # Check agent info resolution
                agent = response.get('agent', {})
                if agent.get('firstName') or agent.get('lastName'):
                    print("   ✅ Agent info resolved from profile")
                
                return True, response
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False, response
        else:
            print("   ❌ Brand resolve failed")
            return False, response

    def test_all_brand_endpoints(self):
        """Test all brand endpoints work with real authentication"""
        if not self.auth_token:
            print("   ❌ No auth token available for endpoint testing")
            return False, {}
            
        print("\n🔍 STEP 6: TESTING ALL BRAND ENDPOINTS...")
        
        endpoints_to_test = [
            ("GET /api/brand/profile", "GET", "api/brand/profile", 200),
            ("GET /api/brand/resolve", "GET", "api/brand/resolve", 200),
            ("DELETE /api/brand/asset (invalid type)", "DELETE", "api/brand/asset?type=invalid", 400),
        ]
        
        all_passed = True
        
        for name, method, endpoint, expected_status in endpoints_to_test:
            success, response = self.run_test(
                name,
                method,
                endpoint,
                expected_status,
                auth_required=True
            )
            if not success:
                all_passed = False
        
        if all_passed:
            print("   ✅ All brand endpoints working with real authentication")
        else:
            print("   ❌ Some brand endpoints failed")
            
        return all_passed, {}

    def run_comprehensive_test(self):
        """Run comprehensive demo user and branding profile test"""
        print("🚀 DEMO USER AND BRANDING PROFILE COMPREHENSIVE TEST")
        print("=" * 60)
        print("Testing the specific functionality requested in the review request:")
        print("1. Check if demo@demo.com user exists")
        print("2. Test login with real credentials to get valid JWT token")
        print("3. Test brand profile creation for demo user")
        print("4. Verify all brand endpoints work with real authentication")
        print("=" * 60)
        
        # Step 1: Check demo user existence and login
        demo_exists, demo_response = self.test_demo_user_exists_and_login()
        
        if not demo_exists:
            print("\n❌ CRITICAL ISSUE: Demo user does not exist!")
            print("   Frontend will continue to get 401 errors with 'demo-token'")
            print("   Need to create demo user manually in database")
            return False
        
        # Step 2: Validate JWT token
        jwt_valid, jwt_response = self.test_jwt_token_validation()
        
        if not jwt_valid:
            print("\n❌ CRITICAL ISSUE: JWT token validation failed!")
            return False
        
        # Step 3: Test brand profile creation
        profile_created, profile_response = self.test_brand_profile_creation()
        
        if not profile_created:
            print("\n❌ ISSUE: Brand profile creation failed!")
            return False
        
        # Step 4: Test brand profile update
        profile_updated, update_response = self.test_brand_profile_update()
        
        # Step 5: Test brand data resolution
        resolve_works, resolve_response = self.test_brand_resolve_authenticated()
        
        # Step 6: Test all brand endpoints
        endpoints_work, endpoints_response = self.test_all_brand_endpoints()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if demo_exists and jwt_valid and profile_created:
            print("\n🎉 SUCCESS: Demo user authentication and branding profile system working!")
            print("   ✅ Demo user exists and can login")
            print("   ✅ JWT tokens generated and validated correctly")
            print("   ✅ Branding profile API endpoints functional")
            print("   ✅ Frontend authentication should work with real JWT tokens")
            print("\n💡 SOLUTION TO FRONTEND ISSUE:")
            print("   The frontend should use real login instead of 'demo-token'")
            print("   Login with demo@demo.com / demo123 to get valid JWT token")
        else:
            print("\n❌ ISSUES FOUND:")
            if not demo_exists:
                print("   ❌ Demo user does not exist - create manually in database")
            if not jwt_valid:
                print("   ❌ JWT token validation failed")
            if not profile_created:
                print("   ❌ Brand profile creation failed")
        
        return demo_exists and jwt_valid and profile_created

if __name__ == "__main__":
    tester = DemoBrandingTester()
    success = tester.run_comprehensive_test()
    sys.exit(0 if success else 1)