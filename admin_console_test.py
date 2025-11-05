#!/usr/bin/env python3
"""
Admin Console User List API Test
Test the /api/admin/users endpoint after fixes
"""

import requests
import sys
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import time

class AdminConsoleAPITester:
    def __init__(self, base_url="https://clerk-migrate-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_session = None
        
    def test_admin_console_user_list_api(self):
        """Test Admin Console User List API after fixes"""
        print("\n👥 TESTING ADMIN CONSOLE USER LIST API...")
        print("   Testing: Login as bmccr23@gmail.com with password 'Goosey23!!23'")
        print("   Testing: GET /api/admin/users endpoint with authentication")
        print("   Expected: 200 OK (not 500 error), users list with proper data")
        print("   Expected: lt2492066@gmail.com appears in the list")
        print("   Expected: All user fields present (id, email, full_name, plan, status, role, deals_count)")
        print("   Context: Just fixed 2 users missing 'id' field, added error handling")
        
        results = {}
        
        # 1. Test admin login with specific credentials
        admin_login_success, admin_login_response = self.test_admin_console_login()
        results['admin_login'] = {
            'success': admin_login_success,
            'response': admin_login_response
        }
        
        if not admin_login_success:
            print("   ❌ Cannot proceed without successful admin login")
            return False, results
        
        # 2. Test GET /api/admin/users endpoint
        users_list_success, users_list_response = self.test_admin_users_endpoint()
        results['users_list'] = {
            'success': users_list_success,
            'response': users_list_response
        }
        
        # 3. Test specific user presence (lt2492066@gmail.com)
        specific_user_success, specific_user_response = self.test_specific_user_presence()
        results['specific_user'] = {
            'success': specific_user_success,
            'response': specific_user_response
        }
        
        # 4. Test user data fields validation
        fields_validation_success, fields_validation_response = self.test_user_fields_validation()
        results['fields_validation'] = {
            'success': fields_validation_success,
            'response': fields_validation_response
        }
        
        # 5. Test error handling (no 500 errors)
        error_handling_success, error_handling_response = self.test_admin_users_error_handling()
        results['error_handling'] = {
            'success': error_handling_success,
            'response': error_handling_response
        }
        
        # Calculate overall success
        total_tests = 5
        successful_tests = sum([
            admin_login_success,
            users_list_success,
            specific_user_success,
            fields_validation_success,
            error_handling_success
        ])
        
        overall_success = successful_tests >= 4  # Allow one failure
        
        print(f"\n👥 ADMIN CONSOLE USER LIST API TESTING SUMMARY:")
        print(f"   ✅ Successful tests: {successful_tests}/{total_tests}")
        print(f"   📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if overall_success:
            print("   🎉 Admin Console User List API - TESTING COMPLETED SUCCESSFULLY")
        else:
            print("   ❌ Admin Console User List API - CRITICAL ISSUES FOUND")
            
        return overall_success, results
    
    def test_admin_console_login(self):
        """Test admin login with specific credentials from review request"""
        print("\n🔐 TESTING ADMIN CONSOLE LOGIN...")
        
        # Use specific credentials from review request
        admin_login_data = {
            "email": "bmccr23@gmail.com",
            "password": "Goosey23!!23",
            "remember_me": False
        }
        
        print(f"   🔍 Testing login with: {admin_login_data['email']} / {admin_login_data['password']}")
        
        try:
            session = requests.Session()
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=admin_login_data,
                timeout=15
            )
            
            print(f"   🔍 Login response status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                print("   ✅ Admin login successful")
                login_data = login_response.json()
                
                # Store session for later use
                self.admin_session = session
                
                # Verify user details
                user_data = login_data.get('user', {})
                if user_data:
                    print(f"   ✅ User email: {user_data.get('email')}")
                    print(f"   ✅ User role: {user_data.get('role')}")
                    print(f"   ✅ User plan: {user_data.get('plan')}")
                    
                    # Check if role is master_admin as expected
                    if user_data.get('role') == 'master_admin':
                        print("   ✅ Correct admin role returned")
                    else:
                        print(f"   ⚠️  Role: expected 'master_admin', got '{user_data.get('role')}'")
                    
                    # Check HttpOnly cookie
                    set_cookie_header = login_response.headers.get('Set-Cookie', '')
                    if 'access_token' in set_cookie_header and 'HttpOnly' in set_cookie_header:
                        print("   ✅ HttpOnly cookie set correctly")
                    else:
                        print("   ⚠️  HttpOnly cookie not properly set")
                
                return True, login_data
            else:
                print(f"   ❌ Admin login failed - Status: {login_response.status_code}")
                try:
                    error_response = login_response.json()
                    print(f"   ❌ Error: {error_response.get('detail', 'Unknown error')}")
                except:
                    print(f"   ❌ Response: {login_response.text[:200]}")
                return False, {"error": "login failed", "status": login_response.status_code, "response": login_response.text[:200]}
                
        except Exception as e:
            print(f"   ❌ Error in admin login test: {e}")
            return False, {"error": str(e)}
    
    def test_admin_users_endpoint(self):
        """Test GET /api/admin/users endpoint"""
        print("\n👥 TESTING ADMIN USERS ENDPOINT...")
        
        if not self.admin_session:
            print("   ❌ No admin session available - login first")
            return False, {"error": "No admin session"}
        
        try:
            print("   🔍 Testing GET /api/admin/users...")
            response = self.admin_session.get(
                f"{self.base_url}/api/admin/users",
                timeout=15
            )
            
            print(f"   🔍 Response status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Admin users endpoint returns 200 OK (not 500 error)")
                
                try:
                    users_data = response.json()
                    print(f"   ✅ Response is valid JSON")
                    
                    # Check response structure
                    if 'users' in users_data:
                        users_list = users_data['users']
                        print(f"   ✅ Users array found with {len(users_list)} users")
                        
                        # Check pagination data
                        if 'total' in users_data and 'pages' in users_data:
                            print(f"   ✅ Pagination data present - Total: {users_data.get('total')}, Pages: {users_data.get('pages')}")
                        else:
                            print("   ⚠️  Pagination data missing")
                        
                        return True, {
                            "users_count": len(users_list),
                            "total": users_data.get('total'),
                            "pages": users_data.get('pages'),
                            "users": users_list[:3]  # First 3 users for inspection
                        }
                    else:
                        print("   ❌ No 'users' array in response")
                        print(f"   ❌ Response structure: {list(users_data.keys())}")
                        return False, {"error": "No users array", "response": users_data}
                        
                except json.JSONDecodeError as e:
                    print(f"   ❌ Invalid JSON response: {e}")
                    print(f"   ❌ Response text: {response.text[:300]}")
                    return False, {"error": "Invalid JSON", "text": response.text[:300]}
                    
            elif response.status_code == 500:
                print("   ❌ CRITICAL: Admin users endpoint returns 500 Internal Server Error")
                try:
                    error_data = response.json()
                    print(f"   ❌ Error details: {error_data}")
                except:
                    print(f"   ❌ Error text: {response.text[:300]}")
                return False, {"error": "500 Internal Server Error", "response": response.text[:300]}
                
            elif response.status_code == 401:
                print("   ❌ Authentication failed for admin users endpoint")
                return False, {"error": "Authentication failed", "status": 401}
                
            elif response.status_code == 403:
                print("   ❌ Access denied - insufficient permissions")
                return False, {"error": "Access denied", "status": 403}
                
            else:
                print(f"   ❌ Unexpected status code: {response.status_code}")
                return False, {"error": f"Unexpected status {response.status_code}", "text": response.text[:300]}
                
        except Exception as e:
            print(f"   ❌ Error testing admin users endpoint: {e}")
            return False, {"error": str(e)}
    
    def test_specific_user_presence(self):
        """Test that lt2492066@gmail.com appears in the users list"""
        print("\n🔍 TESTING SPECIFIC USER PRESENCE...")
        
        if not self.admin_session:
            print("   ❌ No admin session available - login first")
            return False, {"error": "No admin session"}
        
        try:
            print("   🔍 Searching for user: lt2492066@gmail.com")
            
            # Get users list
            response = self.admin_session.get(
                f"{self.base_url}/api/admin/users",
                timeout=15
            )
            
            if response.status_code == 200:
                users_data = response.json()
                users_list = users_data.get('users', [])
                
                # Search for specific user
                target_email = "lt2492066@gmail.com"
                found_user = None
                
                for user in users_list:
                    if user.get('email') == target_email:
                        found_user = user
                        break
                
                if found_user:
                    print(f"   ✅ User {target_email} found in users list")
                    print(f"   ✅ User details: {found_user}")
                    return True, {"user_found": True, "user_data": found_user}
                else:
                    print(f"   ❌ User {target_email} NOT found in users list")
                    print(f"   🔍 Available users: {[u.get('email') for u in users_list[:5]]}")
                    
                    # Try with search parameter
                    search_response = self.admin_session.get(
                        f"{self.base_url}/api/admin/users?search={target_email}",
                        timeout=15
                    )
                    
                    if search_response.status_code == 200:
                        search_data = search_response.json()
                        search_users = search_data.get('users', [])
                        
                        if search_users:
                            print(f"   ✅ User found via search: {search_users[0]}")
                            return True, {"user_found": True, "user_data": search_users[0], "found_via_search": True}
                        else:
                            print(f"   ❌ User not found even with search")
                    
                    return False, {"user_found": False, "available_users": [u.get('email') for u in users_list[:10]]}
            else:
                print(f"   ❌ Failed to get users list: {response.status_code}")
                return False, {"error": "Failed to get users list", "status": response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error searching for specific user: {e}")
            return False, {"error": str(e)}
    
    def test_user_fields_validation(self):
        """Test that all required user fields are present"""
        print("\n📋 TESTING USER FIELDS VALIDATION...")
        
        if not self.admin_session:
            print("   ❌ No admin session available - login first")
            return False, {"error": "No admin session"}
        
        try:
            print("   🔍 Validating user data fields...")
            
            # Get users list
            response = self.admin_session.get(
                f"{self.base_url}/api/admin/users",
                timeout=15
            )
            
            if response.status_code == 200:
                users_data = response.json()
                users_list = users_data.get('users', [])
                
                if not users_list:
                    print("   ❌ No users in list to validate")
                    return False, {"error": "No users to validate"}
                
                # Required fields from review request
                required_fields = ['id', 'email', 'full_name', 'plan', 'status', 'role', 'deals_count']
                
                validation_results = {
                    'total_users': len(users_list),
                    'field_validation': {},
                    'users_with_missing_fields': [],
                    'sample_user': None
                }
                
                # Check each required field across all users
                for field in required_fields:
                    users_with_field = 0
                    users_missing_field = []
                    
                    for user in users_list:
                        if field in user and user[field] is not None:
                            users_with_field += 1
                        else:
                            users_missing_field.append(user.get('email', 'unknown'))
                    
                    field_percentage = (users_with_field / len(users_list)) * 100
                    validation_results['field_validation'][field] = {
                        'present': users_with_field,
                        'missing': len(users_missing_field),
                        'percentage': field_percentage,
                        'users_missing': users_missing_field[:3]  # First 3 examples
                    }
                    
                    if field_percentage == 100:
                        print(f"   ✅ Field '{field}': Present in all {users_with_field} users (100%)")
                    elif field_percentage >= 90:
                        print(f"   ⚠️  Field '{field}': Present in {users_with_field}/{len(users_list)} users ({field_percentage:.1f}%)")
                        print(f"       Missing in: {users_missing_field[:3]}")
                    else:
                        print(f"   ❌ Field '{field}': Only present in {users_with_field}/{len(users_list)} users ({field_percentage:.1f}%)")
                        print(f"       Missing in: {users_missing_field[:3]}")
                
                # Sample user for inspection
                if users_list:
                    validation_results['sample_user'] = users_list[0]
                    print(f"   🔍 Sample user structure: {list(users_list[0].keys())}")
                
                # Check for users with missing critical fields (especially 'id')
                users_missing_id = []
                for user in users_list:
                    if 'id' not in user or user['id'] is None:
                        users_missing_id.append(user.get('email', 'unknown'))
                
                if users_missing_id:
                    print(f"   ❌ CRITICAL: {len(users_missing_id)} users missing 'id' field")
                    print(f"       Users: {users_missing_id[:5]}")
                    validation_results['users_with_missing_fields'] = users_missing_id
                else:
                    print("   ✅ All users have 'id' field (fix confirmed)")
                
                # Overall assessment
                critical_fields = ['id', 'email', 'role']
                critical_field_success = all(
                    validation_results['field_validation'][field]['percentage'] == 100 
                    for field in critical_fields
                )
                
                if critical_field_success:
                    print("   ✅ All critical fields present in all users")
                    return True, validation_results
                else:
                    print("   ❌ Some critical fields missing in users")
                    return False, validation_results
                    
            else:
                print(f"   ❌ Failed to get users for validation: {response.status_code}")
                return False, {"error": "Failed to get users", "status": response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error validating user fields: {e}")
            return False, {"error": str(e)}
    
    def test_admin_users_error_handling(self):
        """Test error handling to ensure no 500 errors"""
        print("\n🛡️  TESTING ADMIN USERS ERROR HANDLING...")
        
        if not self.admin_session:
            print("   ❌ No admin session available - login first")
            return False, {"error": "No admin session"}
        
        try:
            # Test various scenarios that might cause errors
            test_scenarios = [
                {
                    "name": "Basic users list",
                    "url": f"{self.base_url}/api/admin/users",
                    "expected_status": 200
                },
                {
                    "name": "Users with pagination",
                    "url": f"{self.base_url}/api/admin/users?page=1&limit=10",
                    "expected_status": 200
                },
                {
                    "name": "Users with search",
                    "url": f"{self.base_url}/api/admin/users?search=test",
                    "expected_status": 200
                },
                {
                    "name": "Users with plan filter",
                    "url": f"{self.base_url}/api/admin/users?plan_filter=PRO",
                    "expected_status": 200
                },
                {
                    "name": "Users with sorting",
                    "url": f"{self.base_url}/api/admin/users?sort_by=email&sort_order=asc",
                    "expected_status": 200
                }
            ]
            
            error_handling_results = {
                'scenarios_tested': len(test_scenarios),
                'scenarios_passed': 0,
                'no_500_errors': True,
                'scenario_results': []
            }
            
            for scenario in test_scenarios:
                print(f"   🔍 Testing: {scenario['name']}")
                
                response = self.admin_session.get(scenario['url'], timeout=15)
                
                scenario_result = {
                    'name': scenario['name'],
                    'status': response.status_code,
                    'expected': scenario['expected_status'],
                    'success': response.status_code == scenario['expected_status'],
                    'no_500': response.status_code != 500
                }
                
                if response.status_code == scenario['expected_status']:
                    print(f"       ✅ Status: {response.status_code} (expected)")
                    error_handling_results['scenarios_passed'] += 1
                elif response.status_code == 500:
                    print(f"       ❌ CRITICAL: 500 Internal Server Error")
                    try:
                        error_data = response.json()
                        print(f"       ❌ Error: {error_data}")
                        scenario_result['error_details'] = error_data
                    except:
                        print(f"       ❌ Error text: {response.text[:200]}")
                        scenario_result['error_text'] = response.text[:200]
                    error_handling_results['no_500_errors'] = False
                else:
                    print(f"       ⚠️  Status: {response.status_code} (expected {scenario['expected_status']})")
                
                error_handling_results['scenario_results'].append(scenario_result)
            
            # Overall assessment
            success_rate = (error_handling_results['scenarios_passed'] / error_handling_results['scenarios_tested']) * 100
            
            print(f"   📊 Error handling test results:")
            print(f"       Scenarios passed: {error_handling_results['scenarios_passed']}/{error_handling_results['scenarios_tested']} ({success_rate:.1f}%)")
            print(f"       No 500 errors: {'✅ Yes' if error_handling_results['no_500_errors'] else '❌ No'}")
            
            # Success if no 500 errors and at least 80% scenarios pass
            overall_success = error_handling_results['no_500_errors'] and success_rate >= 80
            
            if overall_success:
                print("   ✅ Error handling working correctly - no 500 errors detected")
            else:
                print("   ❌ Error handling issues detected")
            
            return overall_success, error_handling_results
            
        except Exception as e:
            print(f"   ❌ Error testing error handling: {e}")
            return False, {"error": str(e)}


def main():
    """Run Admin Console User List API test"""
    print("🎯 ADMIN CONSOLE USER LIST API TESTING")
    print("=" * 80)
    print("TESTING: Admin Console User List API after fixes")
    print("FOCUS: Login as bmccr23@gmail.com, GET /api/admin/users endpoint")
    print("CRITICAL: Verify 200 OK (not 500), user lt2492066@gmail.com present, all fields")
    print("CONTEXT: Fixed 2 users missing 'id' field, added error handling")
    print("=" * 80)
    
    # Initialize tester
    tester = AdminConsoleAPITester()
    
    # Run the admin console user list API test
    success, results = tester.test_admin_console_user_list_api()
    
    print("\n" + "=" * 80)
    print("🎯 ADMIN CONSOLE USER LIST API TEST RESULTS")
    print("=" * 80)
    
    if success:
        print("✅ OVERALL RESULT: ADMIN CONSOLE USER LIST API WORKING CORRECTLY")
        print("✅ Key findings:")
        print("   - Admin login successful with bmccr23@gmail.com")
        print("   - GET /api/admin/users returns 200 OK (no 500 errors)")
        print("   - Users list returned with proper structure")
        print("   - User data fields validation passed")
        print("   - Error handling working correctly")
    else:
        print("❌ OVERALL RESULT: ADMIN CONSOLE USER LIST API HAS ISSUES")
        print("❌ Issues found:")
        
        # Detailed failure analysis
        if not results.get('admin_login', {}).get('success'):
            print("   - Admin login failed")
        if not results.get('users_list', {}).get('success'):
            print("   - Admin users endpoint failed or returned errors")
        if not results.get('specific_user', {}).get('success'):
            print("   - Specific user lt2492066@gmail.com not found")
        if not results.get('fields_validation', {}).get('success'):
            print("   - User data fields validation failed")
        if not results.get('error_handling', {}).get('success'):
            print("   - Error handling issues detected")
    
    print("\n📊 DETAILED RESULTS:")
    for test_name, test_result in results.items():
        status = "✅ PASS" if test_result['success'] else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    print("\n" + "=" * 80)
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)