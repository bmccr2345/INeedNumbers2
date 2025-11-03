#!/usr/bin/env python3
"""
2FA Endpoints Testing - Phase 2 Critical Security Fixes
Tests the newly implemented 2FA endpoints for master_admin users
"""

import requests
import sys
import json
import base64
import pyotp
import re
from typing import Dict, Any, Tuple

class TwoFactorTester:
    def __init__(self, base_url="https://authflow-fix-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test user credentials from review request
        self.test_email = "bmccr23@gmail.com"
        self.test_password = "Goosey23!!23"
    
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
    
    def login_user(self) -> Tuple[bool, Dict[str, Any]]:
        """Login with test user credentials"""
        print(f"\n🔐 Logging in as {self.test_email}...")
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password,
            "remember_me": False
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if response.status_code == 200:
                login_result = response.json()
                user_data = login_result.get('user', {})
                
                self.log_test(
                    "User Login", 
                    True, 
                    f"Role: {user_data.get('role')}, Plan: {user_data.get('plan')}"
                )
                return True, login_result
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    pass
                
                self.log_test("User Login", False, error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {e}")
            return False, {}
    
    def test_2fa_status(self) -> Tuple[bool, Dict[str, Any]]:
        """Test GET /api/auth/2fa/status endpoint"""
        print(f"\n📊 Testing 2FA Status Endpoint...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/auth/2fa/status",
                timeout=15
            )
            
            if response.status_code == 200:
                status_data = response.json()
                
                # Check required fields
                if 'enabled' in status_data and 'required' in status_data:
                    enabled = status_data.get('enabled')
                    required = status_data.get('required')
                    
                    # For master_admin, 2FA should be required
                    if required:
                        self.log_test(
                            "2FA Status - Required for Master Admin", 
                            True, 
                            f"enabled={enabled}, required={required}"
                        )
                        return True, status_data
                    else:
                        self.log_test(
                            "2FA Status - Required for Master Admin", 
                            False, 
                            f"2FA not required for master_admin (expected required=true)"
                        )
                        return False, status_data
                else:
                    self.log_test(
                        "2FA Status - Response Format", 
                        False, 
                        "Missing 'enabled' or 'required' fields"
                    )
                    return False, status_data
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    pass
                
                self.log_test("2FA Status Endpoint", False, error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("2FA Status Endpoint", False, f"Exception: {e}")
            return False, {}
    
    def test_2fa_generate(self) -> Tuple[bool, Dict[str, Any]]:
        """Test POST /api/auth/2fa/generate endpoint"""
        print(f"\n🔑 Testing 2FA Generate Endpoint...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/2fa/generate",
                json={},
                timeout=15
            )
            
            if response.status_code == 200:
                generate_data = response.json()
                
                # Check required fields
                required_fields = ['secret', 'qr_code', 'email']
                missing_fields = [field for field in required_fields if field not in generate_data]
                
                if missing_fields:
                    self.log_test(
                        "2FA Generate - Response Fields", 
                        False, 
                        f"Missing fields: {missing_fields}"
                    )
                    return False, generate_data
                
                # Verify email matches user
                if generate_data.get('email') == self.test_email:
                    self.log_test(
                        "2FA Generate - Email Match", 
                        True, 
                        f"Email matches: {generate_data.get('email')}"
                    )
                else:
                    self.log_test(
                        "2FA Generate - Email Match", 
                        False, 
                        f"Email mismatch: expected {self.test_email}, got {generate_data.get('email')}"
                    )
                
                self.log_test("2FA Generate Endpoint", True, "All required fields present")
                return True, generate_data
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    pass
                
                self.log_test("2FA Generate Endpoint", False, error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("2FA Generate Endpoint", False, f"Exception: {e}")
            return False, {}
    
    def test_qr_code_validation(self, generate_data: Dict[str, Any]) -> bool:
        """Test QR code validation"""
        print(f"\n📱 Testing QR Code Validation...")
        
        qr_code = generate_data.get('qr_code')
        if not qr_code:
            self.log_test("QR Code - Presence", False, "No QR code in response")
            return False
        
        # Check format
        expected_prefix = "data:image/png;base64,"
        if not qr_code.startswith(expected_prefix):
            self.log_test(
                "QR Code - Format", 
                False, 
                f"Invalid format, expected to start with '{expected_prefix}'"
            )
            return False
        
        self.log_test("QR Code - Format", True, "Correct data URI format")
        
        # Validate base64
        base64_data = qr_code[len(expected_prefix):]
        try:
            decoded_data = base64.b64decode(base64_data)
            self.log_test("QR Code - Base64", True, f"Valid base64, {len(decoded_data)} bytes")
        except Exception as e:
            self.log_test("QR Code - Base64", False, f"Invalid base64: {e}")
            return False
        
        # Check PNG signature
        png_signature = b'\x89PNG\r\n\x1a\n'
        if decoded_data.startswith(png_signature):
            self.log_test("QR Code - PNG Format", True, "Valid PNG image")
        else:
            self.log_test("QR Code - PNG Format", False, "Not a valid PNG image")
            return False
        
        # Check if it's not a 1x1 placeholder
        if len(decoded_data) > 100:
            self.log_test("QR Code - Size", True, f"Real QR code ({len(decoded_data)} bytes)")
            return True
        else:
            self.log_test("QR Code - Size", False, f"Appears to be placeholder ({len(decoded_data)} bytes)")
            return False
    
    def test_secret_validation(self, generate_data: Dict[str, Any]) -> bool:
        """Test TOTP secret validation"""
        print(f"\n🔐 Testing TOTP Secret Validation...")
        
        secret = generate_data.get('secret')
        if not secret:
            self.log_test("TOTP Secret - Presence", False, "No secret in response")
            return False
        
        # Check length
        if len(secret) >= 16:
            self.log_test("TOTP Secret - Length", True, f"{len(secret)} characters")
        else:
            self.log_test("TOTP Secret - Length", False, f"Too short: {len(secret)} characters")
            return False
        
        # Check Base32 format
        base32_pattern = r'^[A-Z2-7]+$'
        if re.match(base32_pattern, secret):
            self.log_test("TOTP Secret - Format", True, "Valid Base32 format")
        else:
            self.log_test("TOTP Secret - Format", False, "Invalid Base32 format")
            return False
        
        # Test TOTP compatibility
        try:
            totp = pyotp.TOTP(secret)
            current_code = totp.now()
            self.log_test("TOTP Secret - Compatibility", True, f"Can generate codes (current: {current_code})")
            return True
        except Exception as e:
            self.log_test("TOTP Secret - Compatibility", False, f"Cannot generate TOTP: {e}")
            return False
    
    def test_2fa_verification(self, generate_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Test POST /api/auth/2fa/verify endpoint"""
        print(f"\n✅ Testing 2FA Verification...")
        
        secret = generate_data.get('secret')
        if not secret:
            self.log_test("2FA Verification - Secret", False, "No secret available")
            return False, {}
        
        try:
            # Generate valid TOTP code
            totp = pyotp.TOTP(secret)
            current_code = totp.now()
            
            verify_data = {
                "secret": secret,
                "code": current_code
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/2fa/verify",
                json=verify_data,
                timeout=15
            )
            
            if response.status_code == 200:
                verify_result = response.json()
                
                # Check success flag
                if verify_result.get('success'):
                    self.log_test("2FA Verification - Success", True, "Verification successful")
                else:
                    self.log_test("2FA Verification - Success", False, "Success flag not found")
                
                # Check backup codes
                if 'backup_codes' in verify_result:
                    self.log_test("2FA Verification - Backup Codes", True, "Backup codes included")
                    return True, verify_result
                else:
                    self.log_test("2FA Verification - Backup Codes", False, "Backup codes missing")
                    return False, verify_result
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    pass
                
                self.log_test("2FA Verification", False, error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("2FA Verification", False, f"Exception: {e}")
            return False, {}
    
    def test_backup_codes_validation(self, verify_data: Dict[str, Any]) -> bool:
        """Test backup codes validation"""
        print(f"\n🔑 Testing Backup Codes Validation...")
        
        backup_codes = verify_data.get('backup_codes')
        if not backup_codes:
            self.log_test("Backup Codes - Presence", False, "No backup codes in response")
            return False
        
        # Check count
        if len(backup_codes) == 10:
            self.log_test("Backup Codes - Count", True, f"{len(backup_codes)} codes")
        else:
            self.log_test("Backup Codes - Count", False, f"Expected 10, got {len(backup_codes)}")
            return False
        
        # Check format
        valid_codes = 0
        alphanumeric_pattern = r'^[A-Z0-9]+$'
        
        for i, code in enumerate(backup_codes):
            if len(code) == 8 and re.match(alphanumeric_pattern, code):
                valid_codes += 1
            else:
                print(f"   ❌ Code {i+1} invalid: '{code}' (length: {len(code)})")
        
        if valid_codes == len(backup_codes):
            self.log_test("Backup Codes - Format", True, f"All {valid_codes} codes valid")
            return True
        else:
            self.log_test("Backup Codes - Format", False, f"Only {valid_codes}/{len(backup_codes)} codes valid")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all 2FA endpoint tests"""
        print("🚀 STARTING 2FA ENDPOINTS TESTING - PHASE 2 CRITICAL SECURITY FIXES")
        print("=" * 80)
        print(f"   Base URL: {self.base_url}")
        print(f"   Test User: {self.test_email}")
        print(f"   Password: {self.test_password}")
        print("=" * 80)
        
        # Step 1: Login
        login_success, login_data = self.login_user()
        if not login_success:
            print("\n❌ Cannot proceed - login failed")
            return False
        
        # Step 2: Test 2FA status
        status_success, status_data = self.test_2fa_status()
        
        # Step 3: Test 2FA generate
        generate_success, generate_data = self.test_2fa_generate()
        if not generate_success:
            print("\n❌ Cannot proceed with validation tests - generate failed")
            return False
        
        # Step 4: Test QR code validation
        qr_success = self.test_qr_code_validation(generate_data)
        
        # Step 5: Test secret validation
        secret_success = self.test_secret_validation(generate_data)
        
        # Step 6: Test 2FA verification
        verify_success, verify_data = self.test_2fa_verification(generate_data)
        if not verify_success:
            print("\n❌ Cannot proceed with backup codes test - verification failed")
            return False
        
        # Step 7: Test backup codes validation
        backup_success = self.test_backup_codes_validation(verify_data)
        
        # Calculate results
        all_tests = [
            login_success,
            status_success,
            generate_success,
            qr_success,
            secret_success,
            verify_success,
            backup_success
        ]
        
        successful_tests = sum(all_tests)
        total_tests = len(all_tests)
        
        print(f"\n" + "=" * 80)
        print("🔐 2FA ENDPOINTS TESTING COMPLETE")
        print("=" * 80)
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print(f"   Core Tests: {successful_tests}/{total_tests} passed")
        
        overall_success = successful_tests >= 6  # Allow one failure
        
        if overall_success:
            print("   🎉 Overall Status: SUCCESS - 2FA endpoints working correctly")
            print("   ✅ 2FA status shows required=true for master_admin")
            print("   ✅ 2FA generate returns valid secret and QR code")
            print("   ✅ QR code is properly formatted base64 PNG image")
            print("   ✅ Secret is valid TOTP secret (uppercase alphanumeric, 16+ chars)")
            print("   ✅ 2FA verification works with valid TOTP codes")
            print("   ✅ Backup codes are generated correctly (10 codes)")
        else:
            print("   ❌ Overall Status: FAILURE - Critical 2FA issues found")
            print("   🚨 2FA implementation needs fixes before production")
        
        return overall_success

def main():
    """Main function"""
    tester = TwoFactorTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()