#!/usr/bin/env python3
"""
Test script for markdown JSON parsing fix in AI Coach
"""

import requests
import json
import sys

def test_markdown_parsing():
    """Test that backend correctly handles markdown wrapped JSON responses"""
    
    base_url = "https://agent-finance.preview.emergentagent.com"
    
    print("📝 TESTING MARKDOWN JSON PARSING FIX...")
    print(f"Base URL: {base_url}")
    
    # Step 1: Authenticate with demo user
    print("\n🔐 Step 1: Authenticating with demo user...")
    
    login_data = {
        "email": "demo@demo.com",
        "password": "demo123",
        "remember_me": True
    }
    
    try:
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            auth_token = login_result.get('access_token')
            print("✅ Authentication successful")
        else:
            print(f"❌ Authentication failed: {login_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return False
    
    # Step 2: Test multiple P&L scenarios to trigger different AI responses
    print("\n📊 Step 2: Testing multiple P&L scenarios...")
    
    test_scenarios = [
        {
            "name": "High Income Scenario",
            "data": {
                "context": "pnl_analysis",
                "pnl_data": {
                    "current_month": {
                        "total_income": 50000,
                        "total_expenses": 8000,
                        "net_profit": 42000,
                        "expense_categories": {
                            "Marketing & Advertising": 4000,
                            "Lead Generation": 2000,
                            "Office Supplies": 500,
                            "Transportation": 1500
                        }
                    },
                    "historical_data": [
                        {"month": "2025-07", "total_income": 45000, "total_expenses": 7500, "net_profit": 37500},
                        {"month": "2025-06", "total_income": 40000, "total_expenses": 7000, "net_profit": 33000}
                    ],
                    "analysis_focus": ["profit_optimization", "expense_trend_analysis"]
                },
                "year": 2025,
                "stream": False
            }
        },
        {
            "name": "Cost Reduction Focus",
            "data": {
                "context": "pnl_analysis",
                "pnl_data": {
                    "current_month": {
                        "total_income": 30000,
                        "total_expenses": 12000,
                        "net_profit": 18000,
                        "expense_categories": {
                            "Marketing & Advertising": 5000,
                            "Lead Generation": 3000,
                            "Office Supplies": 1000,
                            "Professional Development": 2000,
                            "Transportation": 1000
                        }
                    },
                    "historical_data": [
                        {"month": "2025-07", "total_income": 28000, "total_expenses": 11000, "net_profit": 17000}
                    ],
                    "analysis_focus": ["cost_reduction_opportunities", "expense_optimization"]
                },
                "year": 2025,
                "stream": False
            }
        }
    ]
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    successful_tests = 0
    total_tests = len(test_scenarios)
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n🧪 Test {i}/{total_tests}: {scenario['name']}")
        
        try:
            ai_response = requests.post(
                f"{base_url}/api/ai-coach-v2/generate",
                json=scenario['data'],
                headers=headers,
                timeout=30
            )
            
            if ai_response.status_code == 200:
                print("✅ Request successful")
                
                try:
                    response_data = ai_response.json()
                    
                    # Verify response structure
                    if 'formatted_analysis' in response_data and 'summary' in response_data:
                        print("✅ Response contains expected fields")
                        
                        formatted_text = response_data['formatted_analysis']
                        
                        # Check for proper text formatting
                        if isinstance(formatted_text, str) and len(formatted_text) > 50:
                            print(f"✅ Formatted text length: {len(formatted_text)} characters")
                            
                            # Check for markdown artifacts
                            markdown_artifacts = ["```json", "```", "```\n"]
                            has_artifacts = any(artifact in formatted_text for artifact in markdown_artifacts)
                            
                            if not has_artifacts:
                                print("✅ No markdown artifacts found")
                                
                                # Check for readable content
                                readable_indicators = [
                                    "Recommended Actions:",
                                    "Risk Factors:",
                                    "Next Steps:",
                                    "Key Financial",
                                    "**"  # Bold formatting
                                ]
                                
                                has_readable_content = any(indicator in formatted_text for indicator in readable_indicators)
                                
                                if has_readable_content:
                                    print("✅ Contains readable formatted content")
                                    successful_tests += 1
                                    
                                    # Show a brief preview
                                    preview = formatted_text[:150] + "..." if len(formatted_text) > 150 else formatted_text
                                    print(f"📝 Preview: {preview}")
                                    
                                else:
                                    print("❌ Missing readable formatted content")
                                    print(f"Content: {formatted_text[:200]}...")
                            else:
                                print("❌ Markdown artifacts still present")
                                print(f"Artifacts found: {[a for a in markdown_artifacts if a in formatted_text]}")
                        else:
                            print("❌ Formatted text is too short or not a string")
                    else:
                        print("❌ Response missing expected fields")
                        print(f"Available fields: {list(response_data.keys())}")
                        
                except json.JSONDecodeError:
                    print("❌ Response is not valid JSON")
                    
            else:
                print(f"❌ Request failed: {ai_response.status_code}")
                print(f"Response: {ai_response.text[:200]}...")
                
        except Exception as e:
            print(f"❌ Request error: {e}")
    
    # Step 3: Summary
    print(f"\n📊 Step 3: Test Summary")
    print(f"Successful tests: {successful_tests}/{total_tests}")
    success_rate = (successful_tests / total_tests) * 100
    print(f"Success rate: {success_rate:.1f}%")
    
    if successful_tests == total_tests:
        print("\n🎉 MARKDOWN JSON PARSING FIX VERIFIED SUCCESSFULLY!")
        print("✅ Backend correctly handles markdown wrapped JSON responses")
        print("✅ All AI responses are properly formatted for frontend display")
        print("✅ No markdown artifacts leak through to the formatted text")
        return True
    else:
        print(f"\n❌ MARKDOWN PARSING ISSUES DETECTED")
        print(f"Only {successful_tests}/{total_tests} tests passed")
        return False

def main():
    """Main test function"""
    print("=" * 80)
    print("MARKDOWN JSON PARSING FIX TEST")
    print("=" * 80)
    
    success = test_markdown_parsing()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 TEST PASSED - Markdown JSON parsing fix is working correctly!")
        sys.exit(0)
    else:
        print("❌ TEST FAILED - Markdown JSON parsing fix needs attention")
        sys.exit(1)

if __name__ == "__main__":
    main()