#!/usr/bin/env python3
"""
Security Hardening Tests for "I Need Numbers" Application
Tests comprehensive security hardening features implemented in the backend.
"""

import requests
import sys
import json
import uuid
import base64
import time
from datetime import datetime
from typing import Optional, Dict, Any

class SecurityTester:
    def __init__(self, base_url="https://realestate-numbers.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        
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
            elif method == 'OPTIONS':
                response = requests.options(url, headers=default_headers, timeout=15)

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

            return success, response

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, None
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, None
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def setup_authentication(self):
        """Setup authentication for security tests"""
        print("\n🔑 Setting up authentication...")
        
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
        
        if success and hasattr(response, 'json'):
            try:
                response_data = response.json()
                if 'access_token' in response_data:
                    self.auth_token = response_data['access_token']
                    print(f"   ✅ Authentication successful")
                    return True
                else:
                    print(f"   ❌ No access token in response")
                    return False
            except:
                print(f"   ❌ Could not parse login response")
                return False
        else:
            print(f"   ❌ Authentication failed")
            return False

    def test_security_headers(self):
        """Test security headers middleware implementation"""
        print("\n🔒 TESTING SECURITY HEADERS MIDDLEWARE...")
        
        try:
            response = requests.get(f"{self.base_url}/api/auth/me", timeout=10)
            headers = response.headers
            
            # Check for security headers
            security_headers = {
                'Strict-Transport-Security': 'HSTS header',
                'X-Content-Type-Options': 'Content type options header',
                'Referrer-Policy': 'Referrer policy header',
                'X-Frame-Options': 'Frame options header',
                'Content-Security-Policy': 'CSP header'
            }
            
            headers_found = 0
            for header, description in security_headers.items():
                if header in headers:
                    print(f"   ✅ {description} present: {headers[header]}")
                    headers_found += 1
                else:
                    print(f"   ❌ {description} missing")
            
            if headers_found >= 4:
                print(f"   ✅ Security headers middleware working ({headers_found}/5 headers present)")
                return True
            else:
                print(f"   ❌ Security headers middleware incomplete ({headers_found}/5 headers present)")
                return False
                
        except Exception as e:
            print(f"   ❌ Error checking security headers: {str(e)}")
            return False

    def test_cors_allowlist(self):
        """Test CORS allowlist functionality"""
        print("\n🌐 TESTING CORS ALLOWLIST...")
        
        # Test with allowed origin
        allowed_origin = "https://realestate-numbers.preview.emergentagent.com"
        unauthorized_origin = "https://malicious-site.com"
        
        # Test allowed origin
        try:
            response1 = requests.options(
                f"{self.base_url}/api/auth/me",
                headers={
                    'Origin': allowed_origin,
                    'Access-Control-Request-Method': 'GET'
                },
                timeout=10
            )
            
            if 'Access-Control-Allow-Origin' in response1.headers:
                if response1.headers['Access-Control-Allow-Origin'] == allowed_origin:
                    print(f"   ✅ Allowed origin accepted: {allowed_origin}")
                    allowed_success = True
                else:
                    print(f"   ❌ Unexpected CORS response for allowed origin")
                    allowed_success = False
            else:
                print(f"   ❌ No CORS headers for allowed origin")
                allowed_success = False
                
        except Exception as e:
            print(f"   ❌ Error testing allowed origin: {str(e)}")
            allowed_success = False
        
        # Test unauthorized origin
        try:
            response2 = requests.options(
                f"{self.base_url}/api/auth/me",
                headers={
                    'Origin': unauthorized_origin,
                    'Access-Control-Request-Method': 'GET'
                },
                timeout=10
            )
            
            if 'Access-Control-Allow-Origin' in response2.headers:
                if response2.headers['Access-Control-Allow-Origin'] == unauthorized_origin:
                    print(f"   ❌ Unauthorized origin incorrectly allowed: {unauthorized_origin}")
                    unauthorized_blocked = False
                else:
                    print(f"   ✅ Unauthorized origin properly handled")
                    unauthorized_blocked = True
            else:
                print(f"   ✅ No CORS headers for unauthorized origin (properly blocked)")
                unauthorized_blocked = True
                
        except Exception as e:
            print(f"   ❌ Error testing unauthorized origin: {str(e)}")
            unauthorized_blocked = False
        
        return allowed_success and unauthorized_blocked

    def test_body_size_limits(self):
        """Test JSON body size limits (256KB limit)"""
        print("\n📏 TESTING BODY SIZE LIMITS...")
        
        # Create a large JSON payload (over 256KB)
        large_data = {
            "test_field": "x" * (300 * 1024)  # 300KB of data
        }
        
        # Test with oversized payload
        success1, response1 = self.run_test(
            "Body Size Limit Test (Oversized Payload)",
            "POST",
            "api/auth/login",  # Use login endpoint for testing
            413,  # Expected: 413 Payload Too Large or 400 Bad Request
            data=large_data
        )
        
        # Test with normal sized payload
        normal_data = {
            "email": "test@example.com",
            "password": "testpass",
            "remember_me": False
        }
        
        success2, response2 = self.run_test(
            "Body Size Limit Test (Normal Payload)",
            "POST",
            "api/auth/login",
            401,  # Expected: 401 (normal auth failure, not size limit)
            data=normal_data
        )
        
        if success1:
            print("   ✅ Large payload properly rejected")
        else:
            print("   ❌ Large payload not properly rejected")
            
        if success2:
            print("   ✅ Normal payload processed (size limit not triggered)")
        else:
            print("   ❌ Normal payload rejected (unexpected)")
        
        return success1 and success2

    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        print("\n⏱️ TESTING RATE LIMITING...")
        
        if not self.auth_token:
            print("   ⚠️ Skipping rate limiting test - no auth token")
            return False
        
        # Make rapid requests to AI Coach endpoint
        rate_limit_hit = False
        successful_requests = 0
        
        for i in range(8):  # Try 8 requests (should hit 6/minute limit)
            success, response = self.run_test(
                f"Rate Limiting Test - Request {i+1}",
                "POST",
                "api/ai-coach-v2/generate",
                200 if i < 6 else 429,  # Expect 429 after 6 requests
                data={"year": 2025, "force": False},
                auth_required=True
            )
            
            if success and i < 6:
                successful_requests += 1
            elif not success and i >= 6:
                # Check if it's a rate limit response
                if hasattr(response, 'json'):
                    try:
                        response_data = response.json()
                        if 'rate limit' in response_data.get('detail', '').lower():
                            rate_limit_hit = True
                            print(f"   ✅ Rate limit triggered after {i+1} requests")
                            break
                    except:
                        pass
            
            time.sleep(0.5)  # Small delay between requests
        
        if rate_limit_hit:
            print(f"   ✅ Rate limiting working ({successful_requests} successful requests before limit)")
            return True
        else:
            print(f"   ❌ Rate limiting not working properly")
            return False

    def test_webhook_security(self):
        """Test Stripe webhook signature verification"""
        print("\n🔐 TESTING WEBHOOK SECURITY...")
        
        # Test webhook without proper signature
        webhook_data = {
            "id": "evt_test_webhook",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session",
                    "customer": "cus_test_customer",
                    "customer_details": {
                        "email": "test@example.com"
                    },
                    "subscription": "sub_test_subscription",
                    "payment_status": "paid"
                }
            }
        }
        
        # Test without signature header (should fail)
        success1, response1 = self.run_test(
            "Webhook Security (No Signature)",
            "POST",
            "api/stripe/webhook",
            400,  # Expected: 400 Bad Request for missing signature
            data=webhook_data
        )
        
        # Test with invalid signature header (should fail)
        success2, response2 = self.run_test(
            "Webhook Security (Invalid Signature)",
            "POST",
            "api/stripe/webhook",
            400,  # Expected: 400 Bad Request for invalid signature
            data=webhook_data,
            headers={"Stripe-Signature": "invalid_signature"}
        )
        
        if success1:
            print("   ✅ Webhook properly rejects requests without signature")
        else:
            print("   ❌ Webhook accepts requests without signature")
            
        if success2:
            print("   ✅ Webhook properly rejects requests with invalid signature")
        else:
            print("   ❌ Webhook accepts requests with invalid signature")
        
        return success1 and success2

    def test_plan_based_access_control(self):
        """Test plan-based access control"""
        print("\n🚪 TESTING PLAN-BASED ACCESS CONTROL...")
        
        if not self.auth_token:
            print("   ⚠️ Skipping plan access test - no auth token")
            return False
        
        # Test P&L endpoints (should require PRO plan)
        success1, response1 = self.run_test(
            "P&L Access Control (Deals)",
            "GET",
            "api/pnl/deals?month=2025-01",
            200,  # Should work for PRO user
            auth_required=True
        )
        
        success2, response2 = self.run_test(
            "P&L Access Control (Expenses)",
            "GET",
            "api/pnl/expenses?month=2025-01",
            200,  # Should work for PRO user
            auth_required=True
        )
        
        # Test AI Coach (should require STARTER/PRO plan)
        success3, response3 = self.run_test(
            "AI Coach Access Control",
            "POST",
            "api/ai-coach-v2/generate",
            200,  # Should work for PRO user
            data={"year": 2025, "force": False},
            auth_required=True
        )
        
        if success1:
            print("   ✅ P&L deals endpoint accessible for PRO user")
        else:
            print("   ❌ P&L deals endpoint not accessible")
            
        if success2:
            print("   ✅ P&L expenses endpoint accessible for PRO user")
        else:
            print("   ❌ P&L expenses endpoint not accessible")
            
        if success3:
            print("   ✅ AI Coach endpoint accessible for PRO user")
        else:
            print("   ❌ AI Coach endpoint not accessible")
        
        return success1 and success2 and success3

    def test_file_upload_security(self):
        """Test secure file upload validation"""
        print("\n📁 TESTING FILE UPLOAD SECURITY...")
        
        if not self.auth_token:
            print("   ⚠️ Skipping file upload test - no auth token")
            return False
        
        # Test file upload endpoint exists
        success1, response1 = self.run_test(
            "File Upload Endpoint Accessibility",
            "POST",
            "api/brand/upload",
            400,  # Expected: 400 for missing file data
            auth_required=True
        )
        
        if success1 and hasattr(response1, 'json'):
            try:
                response_data = response1.json()
                if 'detail' in response_data and ('file' in response_data['detail'].lower() or 'upload' in response_data['detail'].lower()):
                    print("   ✅ File upload endpoint exists and validates input")
                    return True
                else:
                    print("   ❌ File upload endpoint exists but unexpected validation")
                    return False
            except:
                print("   ❌ Could not parse upload response")
                return False
        else:
            print("   ❌ File upload endpoint not accessible")
            return False

    def test_core_api_health(self):
        """Test core API endpoints health"""
        print("\n🏥 TESTING CORE API ENDPOINTS HEALTH...")
        
        if not self.auth_token:
            print("   ⚠️ Skipping core API test - no auth token")
            return False
        
        # Test core endpoints
        endpoints = [
            ("Health Check", "GET", "api/health", 200, False),
            ("P&L Categories", "GET", "api/pnl/categories", 200, True),
            ("P&L Lead Sources", "GET", "api/pnl/lead-sources", 200, True),
            ("P&L Deals", "GET", "api/pnl/deals?month=2025-01", 200, True),
            ("P&L Expenses", "GET", "api/pnl/expenses?month=2025-01", 200, True),
            ("AI Coach Diagnostics", "GET", "api/ai-coach-v2/diag", 200, True),
        ]
        
        successful = 0
        
        for name, method, endpoint, expected_status, auth_required in endpoints:
            success, response = self.run_test(
                f"Core API - {name}",
                method,
                endpoint,
                expected_status,
                auth_required=auth_required
            )
            
            if success:
                successful += 1
                print(f"   ✅ {name} working")
            else:
                print(f"   ❌ {name} failed")
        
        overall_success = successful >= len(endpoints) * 0.8  # 80% success rate
        
        return overall_success

    def run_security_tests(self):
        """Run comprehensive security hardening tests"""
        print("🔒 STARTING SECURITY HARDENING TESTS...")
        print(f"   Base URL: {self.base_url}")
        
        # Setup authentication
        if not self.setup_authentication():
            print("❌ Could not setup authentication - some tests will be skipped")
        
        security_results = {}
        
        # Test 1: Security Headers
        print("\n" + "="*60)
        print("🛡️ SECURITY HEADERS MIDDLEWARE")
        print("="*60)
        security_results['security_headers'] = self.test_security_headers()
        
        # Test 2: CORS Allowlist
        print("\n" + "="*60)
        print("🌐 CORS SECURITY ALLOWLIST")
        print("="*60)
        security_results['cors_allowlist'] = self.test_cors_allowlist()
        
        # Test 3: Body Size Limits
        print("\n" + "="*60)
        print("📏 BODY SIZE LIMITS")
        print("="*60)
        security_results['body_size_limits'] = self.test_body_size_limits()
        
        # Test 4: Rate Limiting
        print("\n" + "="*60)
        print("⏱️ RATE LIMITING")
        print("="*60)
        security_results['rate_limiting'] = self.test_rate_limiting()
        
        # Test 5: Webhook Security
        print("\n" + "="*60)
        print("🔐 WEBHOOK SIGNATURE VERIFICATION")
        print("="*60)
        security_results['webhook_security'] = self.test_webhook_security()
        
        # Test 6: Plan-based Access Control
        print("\n" + "="*60)
        print("🚪 PLAN-BASED ACCESS CONTROL")
        print("="*60)
        security_results['plan_access_control'] = self.test_plan_based_access_control()
        
        # Test 7: File Upload Security
        print("\n" + "="*60)
        print("📁 SECURE FILE UPLOAD VALIDATION")
        print("="*60)
        security_results['file_upload_security'] = self.test_file_upload_security()
        
        # Test 8: Core API Endpoints Health
        print("\n" + "="*60)
        print("🏥 CORE API ENDPOINTS HEALTH CHECK")
        print("="*60)
        security_results['core_api_health'] = self.test_core_api_health()
        
        # Security Summary
        print("\n" + "="*60)
        print("📋 SECURITY HARDENING SUMMARY")
        print("="*60)
        
        total_tests = len(security_results)
        passed_tests = sum(1 for success in security_results.values() if success)
        security_score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"✅ Security Tests Passed: {passed_tests}")
        print(f"❌ Security Tests Failed: {total_tests - passed_tests}")
        print(f"📊 Total Security Tests: {total_tests}")
        print(f"🔒 Security Score: {security_score:.1f}%")
        
        # Detailed results
        for test_name, success in security_results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"   {status} {test_name.replace('_', ' ').title()}")
        
        if security_score >= 85:
            print("🎉 EXCELLENT: Security hardening is working excellently!")
        elif security_score >= 70:
            print("✅ GOOD: Security hardening is working well with minor issues.")
        else:
            print("⚠️ NEEDS ATTENTION: Security hardening has significant issues.")
        
        return security_score, security_results

if __name__ == "__main__":
    tester = SecurityTester()
    security_score, results = tester.run_security_tests()
    
    # Exit with appropriate code
    if security_score >= 70:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure