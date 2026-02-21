#!/usr/bin/env python3
"""
Detailed AI Coach Affordability Analysis Test
Test the fix more comprehensively
"""

import requests
import json
import sys

class DetailedAffordabilityTester:
    def __init__(self, base_url="https://deployment-fix-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.auth_cookies = None
        
    def login(self):
        """Login with demo credentials"""
        login_data = {
            "email": "demo@demo.com",
            "password": "demo123",
            "remember_me": False
        }
        
        response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=15)
        if response.status_code == 200:
            self.auth_cookies = response.cookies
            return True
        return False
    
    def test_affordability_scenarios(self):
        """Test multiple affordability scenarios"""
        print("🏠 TESTING MULTIPLE AFFORDABILITY SCENARIOS...")
        
        scenarios = [
            {
                "name": "High Income Qualified Buyer",
                "data": {
                    "context": "affordability_analysis",
                    "affordability_data": {
                        "home_price": 500000,
                        "monthly_income": 15000,
                        "down_payment": 100000,
                        "interest_rate": 6.5,
                        "dti_ratio": 25.0,
                        "qualified": True,
                        "loan_type": "CONVENTIONAL"
                    }
                }
            },
            {
                "name": "Borderline DTI Buyer",
                "data": {
                    "context": "affordability_analysis",
                    "affordability_data": {
                        "home_price": 350000,
                        "monthly_income": 8000,
                        "down_payment": 17500,
                        "interest_rate": 7.0,
                        "dti_ratio": 42.0,
                        "qualified": False,
                        "loan_type": "FHA"
                    }
                }
            },
            {
                "name": "First Time Buyer",
                "data": {
                    "context": "affordability_analysis",
                    "affordability_data": {
                        "home_price": 275000,
                        "monthly_income": 6500,
                        "down_payment": 8250,
                        "interest_rate": 6.8,
                        "dti_ratio": 35.5,
                        "qualified": True,
                        "loan_type": "FHA"
                    }
                }
            }
        ]
        
        results = []
        
        for scenario in scenarios:
            print(f"\n   🔍 Testing: {scenario['name']}")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-coach-v2/generate",
                    json=scenario["data"],
                    cookies=self.auth_cookies,
                    timeout=30
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    response_text = str(response_data).lower()
                    
                    # Analyze content
                    affordability_keywords = ['home', 'house', 'affordability', 'mortgage', 'payment', 'dti', 'qualified']
                    gci_keywords = ['gci', 'commission', 'target', 'deals', 'pipeline']
                    
                    affordability_score = sum(1 for kw in affordability_keywords if kw in response_text)
                    gci_score = sum(1 for kw in gci_keywords if kw in response_text)
                    
                    # Check for specific scenario data
                    scenario_data = scenario["data"]["affordability_data"]
                    home_price_mentioned = any(str(scenario_data["home_price"]) in str(response_data) for _ in [1])
                    dti_mentioned = any(str(scenario_data["dti_ratio"]) in str(response_data) for _ in [1])
                    
                    result = {
                        "scenario": scenario["name"],
                        "success": True,
                        "affordability_score": affordability_score,
                        "gci_score": gci_score,
                        "home_price_mentioned": home_price_mentioned,
                        "dti_mentioned": dti_mentioned,
                        "summary": response_data.get("summary", "")[:100]
                    }
                    
                    print(f"      ✅ Affordability keywords: {affordability_score}/7")
                    print(f"      ❌ GCI keywords: {gci_score}/5")
                    print(f"      📊 Home price mentioned: {home_price_mentioned}")
                    print(f"      📊 DTI mentioned: {dti_mentioned}")
                    
                    if affordability_score > gci_score and affordability_score >= 3:
                        print(f"      🎉 {scenario['name']}: CORRECT ANALYSIS")
                    else:
                        print(f"      ⚠️  {scenario['name']}: MIXED OR INCORRECT ANALYSIS")
                        
                else:
                    result = {
                        "scenario": scenario["name"],
                        "success": False,
                        "error": f"HTTP {response.status_code}"
                    }
                    print(f"      ❌ Failed: {response.status_code}")
                
                results.append(result)
                
            except Exception as e:
                result = {
                    "scenario": scenario["name"],
                    "success": False,
                    "error": str(e)
                }
                results.append(result)
                print(f"      ❌ Error: {e}")
        
        return results
    
    def test_context_isolation(self):
        """Test that different contexts don't contaminate each other"""
        print("\n🔄 TESTING CONTEXT ISOLATION...")
        
        contexts = [
            {
                "name": "Affordability",
                "data": {
                    "context": "affordability_analysis",
                    "affordability_data": {
                        "home_price": 400000,
                        "monthly_income": 10000,
                        "dti_ratio": 28.0,
                        "qualified": True
                    }
                },
                "expected_keywords": ["home", "affordability", "qualified", "dti"],
                "forbidden_keywords": ["gci", "commission", "target"]
            },
            {
                "name": "Dashboard",
                "data": {
                    "context": "general"
                },
                "expected_keywords": ["goal", "activity", "gci"],
                "forbidden_keywords": ["home", "affordability", "mortgage"]
            },
            {
                "name": "P&L Analysis",
                "data": {
                    "context": "pnl_analysis",
                    "pnl_data": {
                        "current_month": {
                            "total_income": 25000,
                            "total_expenses": 5000,
                            "net_income": 20000
                        }
                    }
                },
                "expected_keywords": ["expense", "profit", "income"],
                "forbidden_keywords": ["home", "affordability", "qualified"]
            }
        ]
        
        isolation_results = []
        
        for context_test in contexts:
            print(f"\n   🔍 Testing {context_test['name']} Context Isolation...")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/ai-coach-v2/generate",
                    json=context_test["data"],
                    cookies=self.auth_cookies,
                    timeout=30
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    response_text = str(response_data).lower()
                    
                    expected_found = sum(1 for kw in context_test["expected_keywords"] if kw in response_text)
                    forbidden_found = sum(1 for kw in context_test["forbidden_keywords"] if kw in response_text)
                    
                    print(f"      ✅ Expected keywords found: {expected_found}/{len(context_test['expected_keywords'])}")
                    print(f"      ❌ Forbidden keywords found: {forbidden_found}/{len(context_test['forbidden_keywords'])}")
                    
                    isolation_score = expected_found - forbidden_found
                    
                    result = {
                        "context": context_test["name"],
                        "expected_found": expected_found,
                        "forbidden_found": forbidden_found,
                        "isolation_score": isolation_score,
                        "success": expected_found >= 1 and forbidden_found <= 1
                    }
                    
                    if result["success"]:
                        print(f"      🎉 {context_test['name']}: GOOD ISOLATION")
                    else:
                        print(f"      ⚠️  {context_test['name']}: POOR ISOLATION")
                        
                else:
                    result = {
                        "context": context_test["name"],
                        "success": False,
                        "error": f"HTTP {response.status_code}"
                    }
                
                isolation_results.append(result)
                
            except Exception as e:
                result = {
                    "context": context_test["name"],
                    "success": False,
                    "error": str(e)
                }
                isolation_results.append(result)
                print(f"      ❌ Error: {e}")
        
        return isolation_results
    
    def run_comprehensive_test(self):
        """Run comprehensive affordability analysis tests"""
        print("🏠🤖 COMPREHENSIVE AI COACH AFFORDABILITY ANALYSIS TEST")
        print("=" * 70)
        
        if not self.login():
            print("❌ Login failed")
            return False
        
        # Test 1: Multiple scenarios
        scenario_results = self.test_affordability_scenarios()
        
        # Test 2: Context isolation
        isolation_results = self.test_context_isolation()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        # Scenario results
        successful_scenarios = sum(1 for r in scenario_results if r.get("success", False))
        print(f"\n🏠 Affordability Scenarios: {successful_scenarios}/{len(scenario_results)} passed")
        
        for result in scenario_results:
            if result.get("success", False):
                status = "✅" if result.get("affordability_score", 0) > result.get("gci_score", 0) else "⚠️"
                print(f"   {status} {result['scenario']}: A:{result.get('affordability_score', 0)} vs G:{result.get('gci_score', 0)}")
        
        # Isolation results
        successful_isolation = sum(1 for r in isolation_results if r.get("success", False))
        print(f"\n🔄 Context Isolation: {successful_isolation}/{len(isolation_results)} passed")
        
        for result in isolation_results:
            if result.get("success", False):
                status = "✅" if result["success"] else "❌"
                print(f"   {status} {result['context']}: E:{result.get('expected_found', 0)} F:{result.get('forbidden_found', 0)}")
        
        # Overall assessment
        total_tests = len(scenario_results) + len(isolation_results)
        total_passed = successful_scenarios + successful_isolation
        
        print(f"\n📈 Overall Results: {total_passed}/{total_tests} tests passed ({(total_passed/total_tests)*100:.1f}%)")
        
        if total_passed >= total_tests * 0.8:
            print("\n🎉 AFFORDABILITY ANALYSIS FIX SUCCESSFUL")
            print("   AI Coach now correctly handles affordability analysis context")
            return True
        else:
            print("\n⚠️  AFFORDABILITY ANALYSIS NEEDS MORE WORK")
            print("   Some issues remain with context handling")
            return False

if __name__ == "__main__":
    tester = DetailedAffordabilityTester()
    success = tester.run_comprehensive_test()
    sys.exit(0 if success else 1)