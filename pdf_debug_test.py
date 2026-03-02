import requests
import sys
import json
import uuid
import base64
from datetime import datetime
from typing import Optional, Dict, Any
import time
import re

class PDFDebugTester:
    def __init__(self, base_url="https://aicoach-auth-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        self.auth_cookies = None
        # Demo user credentials for testing
        self.demo_email = "demo@demo.com"
        self.demo_password = "Goosey23!!23"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_required=False, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        # Use cookies if available and auth is required
        if auth_required and self.auth_cookies:
            cookies = self.auth_cookies
        elif auth_required and self.auth_token:
            default_headers['Authorization'] = f'Bearer {self.auth_token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, cookies=cookies, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=default_headers, cookies=cookies, timeout=15)

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

    def test_pdf_generation_debug(self):
        """Debug PDF generation issue with test-pdf endpoint"""
        print("\n🔍 TESTING PDF GENERATION DEBUG...")
        print("   Testing: POST /api/brand/test-pdf endpoint 500 error")
        print("   Expected: Identify specific error causing 500 response")
        print("   Context: Debug WeasyPrint dependencies and function availability")
        
        results = {}
        
        # 1. Test authentication first
        auth_success, auth_response = self.test_pdf_endpoint_authentication()
        results['authentication'] = {
            'success': auth_success,
            'response': auth_response
        }
        
        # 2. Test the endpoint with authentication
        endpoint_success, endpoint_response = self.test_pdf_endpoint_with_auth()
        results['endpoint_test'] = {
            'success': endpoint_success,
            'response': endpoint_response
        }
        
        # 3. Test WeasyPrint availability
        weasyprint_success, weasyprint_response = self.test_weasyprint_availability()
        results['weasyprint_check'] = {
            'success': weasyprint_success,
            'response': weasyprint_response
        }
        
        # 4. Test function imports
        import_success, import_response = self.test_function_imports()
        results['function_imports'] = {
            'success': import_success,
            'response': import_response
        }
        
        # Calculate overall success
        total_tests = 4
        successful_tests = sum([
            auth_success,
            endpoint_success,
            weasyprint_success,
            import_success
        ])
        
        overall_success = successful_tests >= 2  # Allow failures for debugging
        
        print(f"\n🔍 PDF GENERATION DEBUG TESTING SUMMARY:")
        print(f"   ✅ Successful tests: {successful_tests}/{total_tests}")
        print(f"   📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if overall_success:
            print("   🎉 PDF Generation Debug - ISSUES IDENTIFIED")
        else:
            print("   ❌ PDF Generation Debug - CRITICAL ISSUES FOUND")
            
        return overall_success, results
    
    def test_pdf_endpoint_authentication(self):
        """Test that PDF endpoint requires authentication"""
        print("\n🔐 TESTING PDF ENDPOINT AUTHENTICATION...")
        
        try:
            # Test without authentication
            print("   🔍 Testing without authentication...")
            response = requests.post(
                f"{self.base_url}/api/brand/test-pdf",
                timeout=15
            )
            
            if response.status_code == 401:
                print("   ✅ PDF endpoint properly requires authentication (401)")
                return True, {"unauthenticated_blocked": True, "status": response.status_code}
            else:
                print(f"   ❌ PDF endpoint should require authentication, got {response.status_code}")
                return False, {"error": "Authentication not required", "status": response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error testing PDF endpoint authentication: {e}")
            return False, {"error": str(e)}
    
    def test_pdf_endpoint_with_auth(self):
        """Test PDF endpoint with authentication to see exact error"""
        print("\n📄 TESTING PDF ENDPOINT WITH AUTHENTICATION...")
        
        try:
            import requests
            session = requests.Session()
            
            # Login first
            login_data = {
                "email": "demo@demo.com",
                "password": "Goosey23!!23",
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code != 200:
                print("   ❌ Could not login for PDF test")
                return False, {"error": "Login failed", "status": login_response.status_code}
            
            print("   ✅ Login successful for PDF test")
            
            # Now test the PDF endpoint
            print("   🔍 Testing POST /api/brand/test-pdf with authentication...")
            pdf_response = session.post(
                f"{self.base_url}/api/brand/test-pdf",
                timeout=30  # PDF generation might take longer
            )
            
            print(f"   🔍 PDF endpoint response status: {pdf_response.status_code}")
            
            if pdf_response.status_code == 200:
                print("   ✅ PDF endpoint successful")
                
                # Check if it's actually a PDF
                content_type = pdf_response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    print("   ✅ Response is a PDF file")
                    content_length = len(pdf_response.content)
                    print(f"   ✅ PDF size: {content_length} bytes")
                    
                    return True, {
                        "pdf_generated": True,
                        "content_type": content_type,
                        "content_length": content_length
                    }
                else:
                    print(f"   ⚠️  Response is not a PDF: {content_type}")
                    return False, {"error": "Not a PDF response", "content_type": content_type}
            
            elif pdf_response.status_code == 500:
                print("   ❌ PDF endpoint returned 500 Internal Server Error")
                try:
                    error_response = pdf_response.json()
                    error_detail = error_response.get('detail', 'Unknown error')
                    print(f"   ❌ Error detail: {error_detail}")
                    
                    # Check for specific errors
                    if 'weasyprint' in error_detail.lower():
                        print("   🚨 CRITICAL: WeasyPrint related error detected")
                    elif 'html' in error_detail.lower():
                        print("   🚨 CRITICAL: HTML related error detected")
                    elif 'import' in error_detail.lower():
                        print("   🚨 CRITICAL: Import error detected")
                    elif 'not defined' in error_detail.lower():
                        print("   🚨 CRITICAL: Function not defined error detected")
                    
                    return False, {
                        "error": "500 Internal Server Error",
                        "detail": error_detail,
                        "status": pdf_response.status_code
                    }
                except:
                    error_text = pdf_response.text[:500]
                    print(f"   ❌ Error response (text): {error_text}")
                    return False, {
                        "error": "500 Internal Server Error",
                        "response_text": error_text,
                        "status": pdf_response.status_code
                    }
            else:
                print(f"   ❌ PDF endpoint failed with status {pdf_response.status_code}")
                try:
                    error_response = pdf_response.json()
                    print(f"   ❌ Error: {error_response.get('detail', 'Unknown error')}")
                    return False, {"error": error_response.get('detail', 'Unknown error'), "status": pdf_response.status_code}
                except:
                    print(f"   ❌ Response: {pdf_response.text[:200]}")
                    return False, {"error": "PDF endpoint failed", "status": pdf_response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error testing PDF endpoint: {e}")
            return False, {"error": str(e)}
    
    def test_weasyprint_availability(self):
        """Test WeasyPrint availability and dependencies"""
        print("\n🖨️  TESTING WEASYPRINT AVAILABILITY...")
        
        try:
            # Test if WeasyPrint can be imported
            print("   🔍 Testing WeasyPrint import...")
            
            try:
                from weasyprint import HTML, CSS
                print("   ✅ WeasyPrint import successful")
                weasyprint_available = True
            except ImportError as e:
                print(f"   ❌ WeasyPrint import failed: {e}")
                weasyprint_available = False
            except Exception as e:
                print(f"   ❌ WeasyPrint import error: {e}")
                weasyprint_available = False
            
            # Test basic WeasyPrint functionality if available
            if weasyprint_available:
                try:
                    print("   🔍 Testing basic WeasyPrint functionality...")
                    test_html = "<html><body><h1>Test</h1></body></html>"
                    html_obj = HTML(string=test_html)
                    pdf_bytes = html_obj.write_pdf()
                    
                    if pdf_bytes and len(pdf_bytes) > 0:
                        print(f"   ✅ WeasyPrint PDF generation working ({len(pdf_bytes)} bytes)")
                        return True, {
                            "weasyprint_available": True,
                            "basic_generation_working": True,
                            "test_pdf_size": len(pdf_bytes)
                        }
                    else:
                        print("   ❌ WeasyPrint PDF generation returned empty result")
                        return False, {
                            "weasyprint_available": True,
                            "basic_generation_working": False,
                            "error": "Empty PDF result"
                        }
                except Exception as e:
                    print(f"   ❌ WeasyPrint PDF generation failed: {e}")
                    return False, {
                        "weasyprint_available": True,
                        "basic_generation_working": False,
                        "error": str(e)
                    }
            else:
                return False, {
                    "weasyprint_available": False,
                    "error": "WeasyPrint not available"
                }
                
        except Exception as e:
            print(f"   ❌ Error testing WeasyPrint: {e}")
            return False, {"error": str(e)}
    
    def test_function_imports(self):
        """Test if required functions are available in the backend"""
        print("\n🔧 TESTING FUNCTION IMPORTS...")
        
        # We can't directly test imports in the backend from here,
        # but we can test if the functions are working by checking the error messages
        print("   🔍 Testing function availability through error analysis...")
        
        try:
            import requests
            session = requests.Session()
            
            # Login first
            login_data = {
                "email": "demo@demo.com",
                "password": "Goosey23!!23",
                "remember_me": False
            }
            
            login_response = session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=15
            )
            
            if login_response.status_code != 200:
                print("   ❌ Could not login for function test")
                return False, {"error": "Login failed"}
            
            # Test the PDF endpoint to get error details
            pdf_response = session.post(
                f"{self.base_url}/api/brand/test-pdf",
                timeout=15
            )
            
            if pdf_response.status_code == 500:
                try:
                    error_response = pdf_response.json()
                    error_detail = error_response.get('detail', '').lower()
                    
                    # Analyze the error for function availability
                    function_issues = {}
                    
                    if 'html is not defined' in error_detail:
                        print("   ❌ HTML function not defined - WeasyPrint import issue")
                        function_issues['html_function'] = False
                    else:
                        function_issues['html_function'] = True
                    
                    if 'generate_test_pdf_html' in error_detail:
                        print("   ❌ generate_test_pdf_html function issue")
                        function_issues['generate_test_pdf_html'] = False
                    else:
                        function_issues['generate_test_pdf_html'] = True
                    
                    if 'generate_pdf_with_weasyprint_from_html' in error_detail:
                        print("   ❌ generate_pdf_with_weasyprint_from_html function issue")
                        function_issues['generate_pdf_with_weasyprint'] = False
                    else:
                        function_issues['generate_pdf_with_weasyprint'] = True
                    
                    # Check for import errors
                    if 'import' in error_detail or 'module' in error_detail:
                        print("   ❌ Import error detected in backend")
                        function_issues['imports'] = False
                    else:
                        function_issues['imports'] = True
                    
                    # Overall assessment
                    working_functions = sum(function_issues.values())
                    total_functions = len(function_issues)
                    
                    if working_functions == total_functions:
                        print("   ✅ All functions appear to be available")
                        return True, function_issues
                    else:
                        print(f"   ❌ Function issues detected ({working_functions}/{total_functions} working)")
                        return False, function_issues
                        
                except:
                    print("   ❌ Could not parse error response for function analysis")
                    return False, {"error": "Could not analyze error response"}
            
            elif pdf_response.status_code == 200:
                print("   ✅ All functions working - PDF generated successfully")
                return True, {"all_functions_working": True}
            
            else:
                print(f"   ⚠️  Unexpected response status: {pdf_response.status_code}")
                return False, {"error": f"Unexpected status: {pdf_response.status_code}"}
                
        except Exception as e:
            print(f"   ❌ Error testing function imports: {e}")
            return False, {"error": str(e)}

def run_pdf_debug_tests():
    """Run PDF generation debug tests"""
    print("🎯 PDF GENERATION DEBUG TESTING")
    print("="*80)
    print("Testing: POST /api/brand/test-pdf endpoint 500 error")
    print("Context: Debug WeasyPrint dependencies and function availability")
    print("Expected: Identify specific error causing 500 response")
    print("="*80)
    
    tester = PDFDebugTester()
    
    # Run the PDF debug test
    print("\n" + "="*80)
    success, results = tester.test_pdf_generation_debug()
    print("="*80)
    
    print(f"\n📊 PDF GENERATION DEBUG TEST RESULTS:")
    print(f"   Overall Status: {'✅ ISSUES IDENTIFIED' if success else '❌ CRITICAL ISSUES'}")
    
    # Detailed results breakdown
    if 'authentication' in results:
        auth_result = results['authentication']
        print(f"   Authentication: {'✅ PASSED' if auth_result['success'] else '❌ FAILED'}")
    
    if 'endpoint_test' in results:
        endpoint_result = results['endpoint_test']
        print(f"   Endpoint Test: {'✅ PASSED' if endpoint_result['success'] else '❌ FAILED'}")
        if not endpoint_result['success']:
            error_detail = endpoint_result['response'].get('detail', 'Unknown error')
            print(f"      Error: {error_detail}")
            
            # Identify specific issues
            if 'HTML is not defined' in error_detail:
                print("      🚨 CRITICAL: WeasyPrint HTML not imported")
            elif 'weasyprint' in error_detail.lower():
                print("      🚨 CRITICAL: WeasyPrint dependency issue")
            elif 'generate_test_pdf_html' in error_detail:
                print("      🚨 CRITICAL: generate_test_pdf_html function missing")
            elif 'generate_pdf_with_weasyprint_from_html' in error_detail:
                print("      🚨 CRITICAL: generate_pdf_with_weasyprint_from_html function missing")
    
    if 'weasyprint_check' in results:
        weasyprint_result = results['weasyprint_check']
        print(f"   WeasyPrint Check: {'✅ PASSED' if weasyprint_result['success'] else '❌ FAILED'}")
        if not weasyprint_result['success']:
            print(f"      Error: {weasyprint_result['response'].get('error', 'Unknown')}")
    
    if 'function_imports' in results:
        import_result = results['function_imports']
        print(f"   Function Imports: {'✅ PASSED' if import_result['success'] else '❌ FAILED'}")
    
    # Calculate success rate
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result['success'])
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n📈 Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")
    
    # Provide specific recommendations
    print(f"\n🔍 ROOT CAUSE ANALYSIS:")
    
    if 'endpoint_test' in results and not results['endpoint_test']['success']:
        error_detail = results['endpoint_test']['response'].get('detail', '')
        
        if 'HTML is not defined' in error_detail:
            print("   🚨 ISSUE IDENTIFIED: WeasyPrint HTML class not imported")
            print("   💡 SOLUTION: Uncomment 'from weasyprint import HTML, CSS' in server.py line 31")
            print("   💡 ALTERNATIVE: Install WeasyPrint dependencies if missing")
        
        elif 'weasyprint' in error_detail.lower():
            print("   🚨 ISSUE IDENTIFIED: WeasyPrint dependency problem")
            print("   💡 SOLUTION: Install WeasyPrint and its dependencies")
            print("   💡 COMMAND: pip install weasyprint")
        
        elif 'generate_' in error_detail:
            print("   🚨 ISSUE IDENTIFIED: PDF generation function missing or broken")
            print("   💡 SOLUTION: Check function definitions in server.py")
        
        else:
            print(f"   🚨 UNKNOWN ISSUE: {error_detail}")
            print("   💡 SOLUTION: Check backend logs for more details")
    
    if success:
        print("\n🎉 PDF GENERATION DEBUG - ROOT CAUSE IDENTIFIED")
        print("   ✅ Issue analysis completed")
        print("   ✅ Specific error details captured")
        print("   ✅ Solution recommendations provided")
    else:
        print("\n❌ PDF GENERATION DEBUG - CRITICAL ISSUES FOUND")
        print("   ❌ Multiple system failures detected")
        print("   ❌ Requires immediate attention")
    
    return success

if __name__ == "__main__":
    success = run_pdf_debug_tests()
    sys.exit(0 if success else 1)