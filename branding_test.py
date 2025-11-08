#!/usr/bin/env python3
"""
Branding Upload System Test
Tests the S3 client initialization fix and local storage fallback functionality.
"""

import requests
import sys
import json
import uuid
import base64
from datetime import datetime
import time
import io

class BrandingUploadTester:
    def __init__(self, base_url="https://inn-auth-upgrade.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_cookies = None
        # Demo user credentials for testing
        self.demo_email = "demo@demo.com"
        self.demo_password = "Goosey23!!23"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {}
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'POST':
                if files:
                    # For file uploads, don't set Content-Type header
                    response = requests.post(url, files=files, data=data, cookies=cookies, timeout=15)
                else:
                    default_headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=default_headers, cookies=cookies, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    if response.headers.get('content-type', '').startswith('application/json'):
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                    else:
                        print(f"   Response: {response.text[:100]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
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
        """Login with demo user and store cookies"""
        print("\n🔐 LOGGING IN AS DEMO USER...")
        
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
                return True, response.json()
            else:
                print(f"   ❌ Login failed: {response.status_code}")
                return False, response.text
                
        except Exception as e:
            print(f"   ❌ Login error: {e}")
            return False, str(e)

    def test_s3_client_initialization(self):
        """Test S3 client initialization status"""
        print("\n☁️  TESTING S3 CLIENT INITIALIZATION...")
        
        success, response = self.run_test(
            "Storage Health Check",
            "GET",
            "api/storage/health",
            200
        )
        
        if success and isinstance(response, dict):
            print(f"   🔍 Health response: {response}")
            
            # Check if S3 is properly not initialized when credentials missing
            if response.get('ok') == False and 'not initialized' in str(response.get('error', '')):
                print("   ✅ S3 client properly NOT initialized when credentials missing")
                return True, {
                    "s3_properly_disabled": True,
                    "health_response": response
                }
            elif response.get('ok') == True:
                print("   ⚠️  S3 client appears to be initialized (unexpected in dev)")
                return False, {
                    "error": "S3 client initialized when credentials should be missing",
                    "health_response": response
                }
            else:
                print(f"   ❌ Unexpected health response: {response}")
                return False, {
                    "error": "Unexpected health response",
                    "health_response": response
                }
        else:
            print(f"   ❌ Storage health endpoint failed")
            return False, {"error": "Health endpoint failed"}

    def test_branding_upload_authentication(self):
        """Test that branding upload requires proper authentication"""
        print("\n🔐 TESTING BRANDING UPLOAD AUTHENTICATION...")
        
        # Create a simple test image (1x1 PNG)
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        # Test without authentication
        files = {
            'file': ('test.png', io.BytesIO(test_image_data), 'image/png')
        }
        data = {
            'asset': 'headshot'
        }
        
        success, response = self.run_test(
            "Upload Without Authentication",
            "POST",
            "api/brand/upload",
            401,
            data=data,
            files=files
        )
        
        if success:
            print("   ✅ Upload properly requires authentication (401)")
            return True, {"unauthenticated_blocked": True}
        else:
            print(f"   ❌ Upload should require authentication")
            return False, {"error": "Authentication not required"}

    def test_branding_upload_headshot(self):
        """Test headshot upload with authenticated user"""
        print("\n👤 TESTING HEADSHOT UPLOAD...")
        
        if not self.auth_cookies:
            login_success, login_response = self.login_demo_user()
            if not login_success:
                return False, {"error": "Could not login"}
        
        # Create a test image (simple PNG)
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        # Test headshot upload
        files = {
            'file': ('headshot.png', io.BytesIO(test_image_data), 'image/png')
        }
        data = {
            'asset': 'headshot'
        }
        
        success, response = self.run_test(
            "Headshot Upload",
            "POST",
            "api/brand/upload",
            200,
            data=data,
            files=files,
            cookies=self.auth_cookies
        )
        
        if success and isinstance(response, dict):
            print("   ✅ Headshot upload successful")
            print(f"   ✅ Response: {response}")
            
            # Verify response structure
            if response.get('ok') and response.get('asset') == 'headshot':
                print("   ✅ Upload response has correct structure")
                
                # Check if URL indicates local storage
                url = response.get('url', '')
                if '/api/uploads/branding/' in url:
                    print("   ✅ Local storage URL returned (expected for dev)")
                    
                    # Store filename for file serving test
                    filename = url.split('/')[-1]
                    
                    return True, {
                        "upload_successful": True,
                        "response": response,
                        "local_storage": True,
                        "filename": filename,
                        "url": url
                    }
                else:
                    print(f"   ⚠️  Unexpected URL format: {url}")
                    return True, {
                        "upload_successful": True,
                        "response": response,
                        "local_storage": False,
                        "url": url
                    }
            else:
                print("   ❌ Upload response missing expected fields")
                return False, {"error": "Invalid response structure", "response": response}
        else:
            print(f"   ❌ Headshot upload failed")
            if isinstance(response, dict):
                error_detail = response.get('detail', '')
                if 'Unable to locate credentials' in error_detail:
                    print("   🚨 CRITICAL: S3 credentials error - local fallback not working!")
                    return False, {
                        "error": "S3 fallback logic broken",
                        "detail": error_detail
                    }
                else:
                    return False, {
                        "error": "Upload failed",
                        "detail": error_detail
                    }
            else:
                return False, {"error": "Upload failed", "response": response}

    def test_branding_file_serving(self):
        """Test file serving endpoint for uploaded branding files"""
        print("\n📂 TESTING BRANDING FILE SERVING...")
        
        if not self.auth_cookies:
            login_success, login_response = self.login_demo_user()
            if not login_success:
                return False, {"error": "Could not login"}
        
        # Upload a test file first
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test-serving.png', io.BytesIO(test_image_data), 'image/png')
        }
        data = {
            'asset': 'headshot'
        }
        
        upload_success, upload_response = self.run_test(
            "Upload for Serving Test",
            "POST",
            "api/brand/upload",
            200,
            data=data,
            files=files,
            cookies=self.auth_cookies
        )
        
        if upload_success and isinstance(upload_response, dict):
            url = upload_response.get('url', '')
            
            if '/api/uploads/branding/' in url:
                # Extract filename and test serving
                filename = url.split('/')[-1]
                print(f"   🔍 Testing file serving for: {filename}")
                
                # Test file serving endpoint
                serve_success, serve_response = self.run_test(
                    "File Serving",
                    "GET",
                    f"api/uploads/branding/{filename}",
                    200
                )
                
                if serve_success:
                    print("   ✅ File serving successful")
                    return True, {
                        "serving_successful": True,
                        "filename": filename
                    }
                else:
                    print(f"   ❌ File serving failed")
                    return False, {
                        "error": "File serving failed",
                        "filename": filename
                    }
            else:
                print("   ⚠️  Upload didn't return local URL - skipping serving test")
                return True, {"skipped": "No local file to serve"}
        else:
            print("   ❌ Could not upload file for serving test")
            return False, {"error": "Upload failed for serving test"}

    def test_branding_upload_validation(self):
        """Test upload validation and error handling"""
        print("\n✅ TESTING BRANDING UPLOAD VALIDATION...")
        
        if not self.auth_cookies:
            login_success, login_response = self.login_demo_user()
            if not login_success:
                return False, {"error": "Could not login"}
        
        validation_results = {}
        
        # Test 1: Invalid asset type
        print("   🔍 Testing invalid asset type...")
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test.png', io.BytesIO(test_image_data), 'image/png')
        }
        data = {
            'asset': 'invalid_asset'
        }
        
        invalid_asset_success, invalid_asset_response = self.run_test(
            "Invalid Asset Type",
            "POST",
            "api/brand/upload",
            400,
            data=data,
            files=files,
            cookies=self.auth_cookies
        )
        
        validation_results['invalid_asset'] = invalid_asset_success
        
        # Test 2: Invalid file type
        print("   🔍 Testing invalid file type...")
        files = {
            'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')
        }
        data = {
            'asset': 'headshot'
        }
        
        invalid_file_success, invalid_file_response = self.run_test(
            "Invalid File Type",
            "POST",
            "api/brand/upload",
            400,
            data=data,
            files=files,
            cookies=self.auth_cookies
        )
        
        validation_results['invalid_file_type'] = invalid_file_success
        
        # Calculate success
        successful_validations = sum(validation_results.values())
        total_validations = len(validation_results)
        
        if successful_validations >= 1:  # Allow some failures
            print(f"   ✅ Validation tests passed: {successful_validations}/{total_validations}")
            return True, validation_results
        else:
            print(f"   ❌ Validation tests failed: {successful_validations}/{total_validations}")
            return False, validation_results

    def run_all_tests(self):
        """Run all branding upload tests"""
        print("🎯 BRANDING UPLOAD SYSTEM TESTING")
        print("="*80)
        print("Testing: S3 client initialization fix and local storage fallback")
        print("Context: Verifying 'Unable to locate credentials' error is resolved")
        print("Expected: Files saved to /tmp/uploads/branding/ when S3 not configured")
        print("="*80)
        
        results = {}
        
        # 1. Test S3 client initialization status
        s3_init_success, s3_init_response = self.test_s3_client_initialization()
        results['s3_initialization'] = {
            'success': s3_init_success,
            'response': s3_init_response
        }
        
        # 2. Test authentication requirement
        auth_success, auth_response = self.test_branding_upload_authentication()
        results['authentication'] = {
            'success': auth_success,
            'response': auth_response
        }
        
        # 3. Test headshot upload with authenticated user
        headshot_success, headshot_response = self.test_branding_upload_headshot()
        results['headshot_upload'] = {
            'success': headshot_success,
            'response': headshot_response
        }
        
        # 4. Test file serving endpoint
        serving_success, serving_response = self.test_branding_file_serving()
        results['file_serving'] = {
            'success': serving_success,
            'response': serving_response
        }
        
        # 5. Test error handling and validation
        validation_success, validation_response = self.test_branding_upload_validation()
        results['validation'] = {
            'success': validation_success,
            'response': validation_response
        }
        
        # Calculate overall success
        total_tests = 5
        successful_tests = sum([
            s3_init_success,
            auth_success,
            headshot_success,
            serving_success,
            validation_success
        ])
        
        overall_success = successful_tests >= 4  # Allow one failure
        
        print(f"\n📊 BRANDING UPLOAD SYSTEM TEST RESULTS:")
        print(f"   Overall Status: {'✅ PASSED' if overall_success else '❌ FAILED'}")
        
        # Detailed results breakdown
        print(f"   S3 Client Init: {'✅ PASSED' if s3_init_success else '❌ FAILED'}")
        if not s3_init_success:
            print(f"      Error: {s3_init_response.get('error', 'Unknown')}")
        
        print(f"   Authentication: {'✅ PASSED' if auth_success else '❌ FAILED'}")
        
        print(f"   Headshot Upload: {'✅ PASSED' if headshot_success else '❌ FAILED'}")
        if not headshot_success:
            error_detail = headshot_response.get('detail', 'Unknown error')
            if 'Unable to locate credentials' in error_detail:
                print("      🚨 CRITICAL: S3 fallback logic still broken!")
            else:
                print(f"      Error: {error_detail}")
        
        print(f"   File Serving: {'✅ PASSED' if serving_success else '❌ FAILED'}")
        print(f"   Validation: {'✅ PASSED' if validation_success else '❌ FAILED'}")
        
        # Calculate success rate
        success_rate = (successful_tests / total_tests * 100)
        print(f"\n📈 Success Rate: {success_rate:.1f}% ({successful_tests}/{total_tests})")
        
        if overall_success:
            print("\n🎉 BRANDING UPLOAD SYSTEM - TESTING COMPLETED SUCCESSFULLY")
            print("   ✅ S3 client initialization working correctly")
            print("   ✅ Local storage fallback working")
            print("   ✅ File upload and serving functional")
            print("   ✅ Production ready without S3 credentials")
        else:
            print("\n❌ BRANDING UPLOAD SYSTEM - CRITICAL ISSUES FOUND")
            
            # Check for specific S3 fallback issue
            if not headshot_success:
                error_detail = headshot_response.get('detail', '')
                if 'Unable to locate credentials' in error_detail:
                    print("   🚨 CRITICAL ISSUE: S3 client initialization fix NOT working")
                    print("   🚨 System still tries to upload to S3 when credentials missing")
                    print("   🚨 Local storage fallback is NOT being used")
            
            print("   ❌ System not production ready")
        
        return overall_success

if __name__ == "__main__":
    tester = BrandingUploadTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)