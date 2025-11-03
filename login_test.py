#!/usr/bin/env python3
"""
Login Endpoint Isolation Testing
Focused testing for the P&L Tracker authentication issue
"""

import requests
import sys
import json
import uuid
import base64
from datetime import datetime
from typing import Optional, Dict, Any
import time
import re

class LoginEndpointTester:
    def __init__(self, base_url="https://authflow-fix-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        # Demo user credentials for testing the specific login issue
        self.demo_email = "demo@demo.com"
        self.demo_password = "demo"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=15):
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
                response = requests.get(url, headers=default_headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=timeout)
            elif method == 'OPTIONS':
                response = requests.options(url, headers=default_headers, timeout=timeout)

            success = response.status_code == expected_status or (isinstance(expected_status, list) and response.status_code in expected_status)
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

    def test_login_endpoint_isolation(self):
        """Test login endpoint directly with curl to isolate authentication issue"""
        print("\n🔐 TESTING LOGIN ENDPOINT ISOLATION...")
        print("   Testing the specific authentication issue reported:")
        print("   - Frontend shows 'Invalid email or password' on all login attempts")
        print("   - Backend logs show 'Password verification failed - Argon2id mismatch'")
        print("   - POST /api/auth/login always returns 401 Unauthorized")
        print("   - Database contains correct user: demo@demo.com with PRO plan")
        
        results = {}
        
        # 1. Test login endpoint accessibility
        endpoint_access_success, endpoint_access_response = self.test_login_endpoint_accessibility()
        results['endpoint_accessibility'] = {
            'success': endpoint_access_success,
            'response': endpoint_access_response
        }
        
        # 2. Test request parsing and validation
        request_parsing_success, request_parsing_response = self.test_login_request_parsing()
        results['request_parsing'] = {
            'success': request_parsing_success,
            'response': request_parsing_response
        }
        
        # 3. Test user lookup in database
        user_lookup_success, user_lookup_response = self.test_user_lookup()
        results['user_lookup'] = {
            'success': user_lookup_success,
            'response': user_lookup_response
        }
        
        # 4. Test password verification process
        password_verification_success, password_verification_response = self.test_password_verification_process()
        results['password_verification'] = {
            'success': password_verification_success,
            'response': password_verification_response
        }
        
        # 5. Test response headers and cookie setting
        response_headers_success, response_headers_response = self.test_login_response_headers()
        results['response_headers'] = {
            'success': response_headers_success,
            'response': response_headers_response
        }
        
        # 6. Test middleware interference
        middleware_success, middleware_response = self.test_middleware_interference()
        results['middleware_interference'] = {
            'success': middleware_success,
            'response': middleware_response
        }
        
        # Calculate overall success
        total_tests = 6
        successful_tests = sum([
            endpoint_access_success,
            request_parsing_success,
            user_lookup_success,
            password_verification_success,
            response_headers_success,
            middleware_success
        ])
        
        overall_success = successful_tests >= 4  # Allow some failures for diagnosis
        
        print(f"\n🔐 LOGIN ENDPOINT ISOLATION TESTING SUMMARY:")
        print(f"   ✅ Successful tests: {successful_tests}/{total_tests}")
        print(f"   📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if overall_success:
            print("   🎉 Login Endpoint Isolation - TESTING COMPLETED")
        else:
            print("   ❌ Login Endpoint Isolation - CRITICAL ISSUES IDENTIFIED")
            
        return overall_success, results
    
    def test_login_endpoint_accessibility(self):
        """Test if the login endpoint is accessible and responding"""
        print("\n🌐 TESTING LOGIN ENDPOINT ACCESSIBILITY...")
        
        try:
            # Test 1: Basic endpoint accessibility with OPTIONS request
            options_response = requests.options(
                f"{self.base_url}/api/auth/login",
                timeout=10
            )
            
            print(f"   ✅ OPTIONS request status: {options_response.status_code}")
            print(f"   ✅ Allowed methods: {options_response.headers.get('Allow', 'Not specified')}")
            
            # Test 2: POST request with no data (should get 422 validation error, not 404)
            empty_post_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={},
                timeout=10
            )
            
            if empty_post_response.status_code == 404:
                print("   ❌ Login endpoint returns 404 - endpoint not found or not registered")
                return False, {"error": "Endpoint not found", "status": 404}
            elif empty_post_response.status_code in [400, 422]:
                print(f"   ✅ Login endpoint accessible - returns {empty_post_response.status_code} for empty request")
            else:
                print(f"   ⚠️  Login endpoint returns unexpected status {empty_post_response.status_code} for empty request")
            
            # Test 3: POST request with malformed JSON
            try:
                malformed_response = requests.post(
                    f"{self.base_url}/api/auth/login",
                    data="invalid json",
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                print(f"   ✅ Malformed JSON request status: {malformed_response.status_code}")
            except Exception as e:
                print(f"   ⚠️  Malformed JSON test failed: {e}")
            
            return True, {
                "options_status": options_response.status_code,
                "empty_post_status": empty_post_response.status_code,
                "endpoint_accessible": True
            }
            
        except requests.exceptions.ConnectionError:
            print("   ❌ Connection error - cannot reach login endpoint")
            return False, {"error": "Connection error"}
        except requests.exceptions.Timeout:
            print("   ❌ Timeout error - login endpoint not responding")
            return False, {"error": "Timeout"}
        except Exception as e:
            print(f"   ❌ Unexpected error testing endpoint accessibility: {e}")
            return False, {"error": str(e)}
    
    def test_login_request_parsing(self):
        """Test if login requests are being parsed correctly"""
        print("\n📝 TESTING LOGIN REQUEST PARSING...")
        
        try:
            # Test 1: Valid request structure with demo credentials
            valid_request = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            print(f"   🔍 Testing with demo credentials: {self.demo_email}")
            
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=valid_request,
                timeout=15
            )
            
            print(f"   ✅ Request sent successfully")
            print(f"   ✅ Response status: {response.status_code}")
            print(f"   ✅ Response headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                print(f"   ✅ Response JSON: {json.dumps(response_data, indent=2)}")
            except:
                print(f"   ⚠️  Response text: {response.text}")
            
            # Test 2: Missing email field
            missing_email_request = {
                "password": self.demo_password,
                "remember_me": False
            }
            
            missing_email_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=missing_email_request,
                timeout=10
            )
            
            print(f"   ✅ Missing email test status: {missing_email_response.status_code}")
            
            # Test 3: Missing password field
            missing_password_request = {
                "email": self.demo_email,
                "remember_me": False
            }
            
            missing_password_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=missing_password_request,
                timeout=10
            )
            
            print(f"   ✅ Missing password test status: {missing_password_response.status_code}")
            
            # Test 4: Invalid email format
            invalid_email_request = {
                "email": "invalid-email",
                "password": self.demo_password,
                "remember_me": False
            }
            
            invalid_email_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=invalid_email_request,
                timeout=10
            )
            
            print(f"   ✅ Invalid email format test status: {invalid_email_response.status_code}")
            
            # Analysis
            if response.status_code == 401:
                print("   ⚠️  Demo credentials return 401 - this is the reported issue")
                print("   🔍 Need to investigate if this is user lookup or password verification failure")
            elif response.status_code == 200:
                print("   ✅ Demo credentials work correctly")
            else:
                print(f"   ❌ Unexpected status code {response.status_code} for demo credentials")
            
            return True, {
                "demo_login_status": response.status_code,
                "demo_login_response": response_data if 'response_data' in locals() else response.text,
                "validation_tests": {
                    "missing_email": missing_email_response.status_code,
                    "missing_password": missing_password_response.status_code,
                    "invalid_email": invalid_email_response.status_code
                }
            }
            
        except Exception as e:
            print(f"   ❌ Error testing request parsing: {e}")
            return False, {"error": str(e)}
    
    def test_user_lookup(self):
        """Test if user lookup is working correctly"""
        print("\n👤 TESTING USER LOOKUP...")
        
        try:
            # Test with demo user email to see if user exists
            print(f"   🔍 Testing user lookup for: {self.demo_email}")
            
            # We can't directly test user lookup, but we can infer from login response
            login_request = {
                "email": self.demo_email,
                "password": "definitely_wrong_password_12345",  # Wrong password to isolate user lookup
                "remember_me": False
            }
            
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_request,
                timeout=15
            )
            
            print(f"   ✅ Wrong password test status: {response.status_code}")
            
            try:
                response_data = response.json()
                error_message = response_data.get('detail', response_data.get('message', ''))
                print(f"   ✅ Error message: {error_message}")
                
                # Analyze error message to determine if user was found
                if 'user not found' in error_message.lower() or 'email' in error_message.lower():
                    print("   ❌ User lookup failed - demo user not found in database")
                    return False, {"error": "User not found", "message": error_message}
                elif 'password' in error_message.lower() or 'invalid' in error_message.lower():
                    print("   ✅ User lookup successful - user found, password verification failed (expected)")
                    user_found = True
                else:
                    print(f"   ⚠️  Unclear error message: {error_message}")
                    user_found = None
                    
            except:
                print(f"   ⚠️  Non-JSON response: {response.text}")
                user_found = None
                error_message = response.text
            
            # Test with non-existent user
            nonexistent_request = {
                "email": "nonexistent_user_12345@example.com",
                "password": "any_password",
                "remember_me": False
            }
            
            nonexistent_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=nonexistent_request,
                timeout=10
            )
            
            print(f"   ✅ Non-existent user test status: {nonexistent_response.status_code}")
            
            try:
                nonexistent_data = nonexistent_response.json()
                nonexistent_message = nonexistent_data.get('detail', nonexistent_data.get('message', ''))
                print(f"   ✅ Non-existent user message: {nonexistent_message}")
            except:
                nonexistent_message = nonexistent_response.text
            
            return True, {
                "demo_user_found": user_found,
                "demo_user_error": error_message,
                "nonexistent_user_status": nonexistent_response.status_code,
                "nonexistent_user_message": nonexistent_message
            }
            
        except Exception as e:
            print(f"   ❌ Error testing user lookup: {e}")
            return False, {"error": str(e)}
    
    def test_password_verification_process(self):
        """Test password verification process in detail"""
        print("\n🔐 TESTING PASSWORD VERIFICATION PROCESS...")
        
        try:
            print(f"   🔍 Testing password verification for demo user: {self.demo_email}")
            print(f"   🔍 Using password: {self.demo_password}")
            
            # Test 1: Correct password
            correct_request = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            correct_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=correct_request,
                timeout=15
            )
            
            print(f"   ✅ Correct password status: {correct_response.status_code}")
            
            try:
                correct_data = correct_response.json()
                print(f"   ✅ Correct password response: {json.dumps(correct_data, indent=2)}")
                
                if correct_response.status_code == 401:
                    error_detail = correct_data.get('detail', '')
                    print(f"   ❌ CRITICAL: Correct password returns 401 - {error_detail}")
                    if 'argon2id' in error_detail.lower() or 'password verification' in error_detail.lower():
                        print("   ❌ CONFIRMED: Argon2id password verification mismatch issue")
                elif correct_response.status_code == 200:
                    print("   ✅ Password verification working correctly")
                    
            except:
                print(f"   ⚠️  Correct password non-JSON response: {correct_response.text}")
            
            # Test 2: Wrong password variations
            wrong_passwords = [
                "wrong_password",
                "Demo",  # Different case
                "demo123",  # Common variation
                "",  # Empty password
                " demo ",  # With spaces
            ]
            
            for wrong_password in wrong_passwords:
                wrong_request = {
                    "email": self.demo_email,
                    "password": wrong_password,
                    "remember_me": False
                }
                
                wrong_response = requests.post(
                    f"{self.base_url}/api/auth/login",
                    json=wrong_request,
                    timeout=10
                )
                
                print(f"   ✅ Wrong password '{wrong_password}' status: {wrong_response.status_code}")
                
                if wrong_response.status_code != 401:
                    print(f"   ⚠️  Expected 401 for wrong password, got {wrong_response.status_code}")
            
            # Test 3: Check if backend logs show specific error
            print("   🔍 Backend should log 'Password verification failed - Argon2id mismatch' if issue exists")
            
            return True, {
                "correct_password_status": correct_response.status_code,
                "correct_password_response": correct_data if 'correct_data' in locals() else correct_response.text,
                "password_verification_issue": correct_response.status_code == 401,
                "argon2id_mismatch": 'argon2id' in str(correct_data if 'correct_data' in locals() else correct_response.text).lower()
            }
            
        except Exception as e:
            print(f"   ❌ Error testing password verification: {e}")
            return False, {"error": str(e)}
    
    def test_login_response_headers(self):
        """Test response headers and cookie setting"""
        print("\n📋 TESTING LOGIN RESPONSE HEADERS...")
        
        try:
            # Test with demo credentials
            login_request = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": True  # Test remember_me functionality
            }
            
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_request,
                timeout=15
            )
            
            print(f"   ✅ Response status: {response.status_code}")
            print(f"   ✅ Response headers:")
            for header, value in response.headers.items():
                print(f"      {header}: {value}")
            
            # Check for Set-Cookie header
            set_cookie = response.headers.get('Set-Cookie', '')
            if set_cookie:
                print(f"   ✅ Set-Cookie header present: {set_cookie}")
                
                # Check cookie attributes
                cookie_attributes = {
                    'HttpOnly': 'HttpOnly' in set_cookie,
                    'Secure': 'Secure' in set_cookie,
                    'SameSite': 'SameSite' in set_cookie,
                    'access_token': 'access_token' in set_cookie
                }
                
                for attr, present in cookie_attributes.items():
                    status = "✅" if present else "❌"
                    print(f"   {status} Cookie {attr}: {present}")
            else:
                print("   ❌ No Set-Cookie header found")
            
            # Check CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
            }
            
            print("   ✅ CORS headers:")
            for header, value in cors_headers.items():
                print(f"      {header}: {value}")
            
            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                print("   ✅ Content-Type is application/json")
            else:
                print(f"   ⚠️  Content-Type: {content_type}")
            
            return True, {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "set_cookie": set_cookie,
                "cookie_attributes": cookie_attributes if 'cookie_attributes' in locals() else {},
                "cors_headers": cors_headers
            }
            
        except Exception as e:
            print(f"   ❌ Error testing response headers: {e}")
            return False, {"error": str(e)}
    
    def test_middleware_interference(self):
        """Test for middleware interference issues"""
        print("\n🔧 TESTING MIDDLEWARE INTERFERENCE...")
        
        try:
            # Test 1: CSRF middleware interference
            print("   🔍 Testing CSRF middleware...")
            
            # Request without CSRF token
            no_csrf_request = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            no_csrf_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=no_csrf_request,
                timeout=15
            )
            
            print(f"   ✅ No CSRF token status: {no_csrf_response.status_code}")
            
            if no_csrf_response.status_code == 403:
                print("   ⚠️  CSRF protection may be blocking login requests")
            elif no_csrf_response.status_code == 401:
                print("   ✅ CSRF not blocking - authentication issue confirmed")
            
            # Test 2: Rate limiting interference
            print("   🔍 Testing rate limiting...")
            
            rate_limit_responses = []
            for i in range(5):  # Make 5 rapid requests
                response = requests.post(
                    f"{self.base_url}/api/auth/login",
                    json=no_csrf_request,
                    timeout=10
                )
                rate_limit_responses.append(response.status_code)
                
                if response.status_code == 429:
                    print(f"   ⚠️  Rate limited after {i+1} requests")
                    break
            
            print(f"   ✅ Rate limit test responses: {rate_limit_responses}")
            
            # Test 3: CORS preflight
            print("   🔍 Testing CORS preflight...")
            
            preflight_response = requests.options(
                f"{self.base_url}/api/auth/login",
                headers={
                    'Origin': 'https://authflow-fix-4.preview.emergentagent.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                timeout=10
            )
            
            print(f"   ✅ CORS preflight status: {preflight_response.status_code}")
            print(f"   ✅ CORS preflight headers: {dict(preflight_response.headers)}")
            
            # Test 4: Content-Type handling
            print("   🔍 Testing Content-Type handling...")
            
            # Test with different content types
            content_type_tests = [
                ('application/json', no_csrf_request),
                ('application/x-www-form-urlencoded', 'email=demo@demo.com&password=demo'),
                ('text/plain', json.dumps(no_csrf_request))
            ]
            
            for content_type, data in content_type_tests:
                try:
                    if content_type == 'application/json':
                        ct_response = requests.post(
                            f"{self.base_url}/api/auth/login",
                            json=data,
                            timeout=10
                        )
                    else:
                        ct_response = requests.post(
                            f"{self.base_url}/api/auth/login",
                            data=data,
                            headers={'Content-Type': content_type},
                            timeout=10
                        )
                    
                    print(f"   ✅ Content-Type {content_type}: {ct_response.status_code}")
                except Exception as e:
                    print(f"   ❌ Content-Type {content_type} error: {e}")
            
            return True, {
                "csrf_interference": no_csrf_response.status_code == 403,
                "rate_limiting": 429 in rate_limit_responses,
                "cors_preflight": preflight_response.status_code,
                "middleware_blocking": False  # Will be determined by analysis
            }
            
        except Exception as e:
            print(f"   ❌ Error testing middleware interference: {e}")
            return False, {"error": str(e)}

    def test_curl_equivalent(self):
        """Test using curl-equivalent requests to isolate the issue"""
        print("\n🌐 TESTING CURL EQUIVALENT REQUESTS...")
        
        try:
            # Test with exact curl equivalent
            print("   🔍 Testing exact curl equivalent request...")
            
            curl_headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'curl/7.68.0'
            }
            
            curl_data = {
                "email": self.demo_email,
                "password": self.demo_password,
                "remember_me": False
            }
            
            curl_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=curl_data,
                headers=curl_headers,
                timeout=15
            )
            
            print(f"   ✅ Curl equivalent status: {curl_response.status_code}")
            print(f"   ✅ Curl equivalent headers: {dict(curl_response.headers)}")
            
            try:
                curl_response_data = curl_response.json()
                print(f"   ✅ Curl equivalent response: {json.dumps(curl_response_data, indent=2)}")
            except:
                print(f"   ⚠️  Curl equivalent response text: {curl_response.text}")
            
            # Test with minimal headers
            minimal_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=curl_data,
                timeout=15
            )
            
            print(f"   ✅ Minimal headers status: {minimal_response.status_code}")
            
            return True, {
                "curl_equivalent_status": curl_response.status_code,
                "curl_equivalent_response": curl_response_data if 'curl_response_data' in locals() else curl_response.text,
                "minimal_headers_status": minimal_response.status_code
            }
            
        except Exception as e:
            print(f"   ❌ Error testing curl equivalent: {e}")
            return False, {"error": str(e)}

if __name__ == "__main__":
    tester = LoginEndpointTester()
    
    print("🚀 Starting Login Endpoint Isolation Testing...")
    print(f"   Base URL: {tester.base_url}")
    print(f"   Demo User: {tester.demo_email}")
    print(f"   Demo Password: {tester.demo_password}")
    
    # Run login endpoint isolation tests
    success, results = tester.test_login_endpoint_isolation()
    
    # Also run curl equivalent test
    print("\n" + "="*60)
    curl_success, curl_results = tester.test_curl_equivalent()
    
    print(f"\n📊 FINAL RESULTS:")
    print(f"   Login Endpoint Isolation: {'✅ PASSED' if success else '❌ FAILED'}")
    print(f"   Curl Equivalent Test: {'✅ PASSED' if curl_success else '❌ FAILED'}")
    
    # Print detailed results
    print(f"\n🔍 DETAILED ANALYSIS:")
    for test_name, test_result in results.items():
        status = "✅ PASSED" if test_result['success'] else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    # Print key findings
    print(f"\n🔑 KEY FINDINGS:")
    
    # Check if demo login is failing
    if 'request_parsing' in results:
        demo_status = results['request_parsing']['response'].get('demo_login_status')
        if demo_status == 401:
            print("   ❌ CRITICAL: Demo user login returns 401 Unauthorized")
            print("   🔍 This confirms the reported authentication issue")
        elif demo_status == 200:
            print("   ✅ Demo user login works correctly")
        else:
            print(f"   ⚠️  Demo user login returns unexpected status: {demo_status}")
    
    # Check password verification
    if 'password_verification' in results:
        password_issue = results['password_verification']['response'].get('password_verification_issue', False)
        argon2id_issue = results['password_verification']['response'].get('argon2id_mismatch', False)
        
        if password_issue:
            print("   ❌ CRITICAL: Password verification failing for correct password")
        if argon2id_issue:
            print("   ❌ CRITICAL: Argon2id mismatch detected in error messages")
    
    # Check middleware interference
    if 'middleware_interference' in results:
        csrf_blocking = results['middleware_interference']['response'].get('csrf_interference', False)
        if csrf_blocking:
            print("   ⚠️  CSRF middleware may be interfering with login")
    
    if success:
        print("\n🎉 LOGIN ENDPOINT ISOLATION TESTING COMPLETED!")
        print("   Check the detailed output above to identify the root cause of the authentication issue.")
    else:
        print("\n❌ CRITICAL AUTHENTICATION ISSUES IDENTIFIED")
        print("   Review the failed tests above to determine the root cause.")
    
    sys.exit(0 if success else 1)