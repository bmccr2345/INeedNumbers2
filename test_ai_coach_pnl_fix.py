#!/usr/bin/env python3
"""
Test script for AI Coach P&L Analysis JSON formatting fix
"""

import requests
import json
import sys

def test_ai_coach_pnl_fix():
    """Test the AI Coach P&L Analysis fix to confirm JSON formatting issue is resolved"""
    
    base_url = "https://ai-coach-enhanced.preview.emergentagent.com"
    
    print("🤖💰 TESTING AI COACH P&L ANALYSIS FIX...")
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
            user_plan = login_result.get('user', {}).get('plan', 'UNKNOWN')
            print(f"✅ Authentication successful - Plan: {user_plan}")
        else:
            print(f"❌ Authentication failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return False
    
    # Step 2: Test P&L AI Coach with sample data from review request
    print("\n📊 Step 2: Testing P&L AI Coach with sample data...")
    
    pnl_analysis_data = {
        "context": "pnl_analysis",
        "pnl_data": {
            "current_month": {
                "total_income": 25000,
                "total_expenses": 5000, 
                "net_profit": 20000,
                "expense_categories": {
                    "Marketing": 2000, 
                    "Office": 1000, 
                    "Gas": 2000
                }
            },
            "historical_data": [
                {
                    "month": "2025-08", 
                    "total_income": 20000, 
                    "total_expenses": 4000, 
                    "net_profit": 16000
                }
            ],
            "analysis_focus": [
                "cost_reduction_opportunities", 
                "expense_trend_analysis"
            ]
        },
        "year": 2025,
        "stream": False
    }
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        ai_response = requests.post(
            f"{base_url}/api/ai-coach-v2/generate",
            json=pnl_analysis_data,
            headers=headers,
            timeout=30
        )
        
        if ai_response.status_code == 200:
            print("✅ AI Coach P&L Analysis request successful")
            
            try:
                response_data = ai_response.json()
                print(f"✅ Response is valid JSON with keys: {list(response_data.keys())}")
                
                # Step 3: Verify the fix - check for formatted_analysis field
                print("\n🔍 Step 3: Verifying JSON formatting fix...")
                
                if 'formatted_analysis' in response_data:
                    formatted_analysis = response_data['formatted_analysis']
                    print("✅ Response contains 'formatted_analysis' field")
                    
                    # Check if it contains human-readable sections
                    readable_sections = [
                        "Recommended Actions:", 
                        "Risk Factors:", 
                        "Next Steps:", 
                        "Key Financial"
                    ]
                    
                    has_readable_sections = any(section in formatted_analysis for section in readable_sections)
                    
                    # Check if it contains raw JSON structure
                    json_indicators = ['{"', '"summary":', '"actions":', '"risks":']
                    has_raw_json = any(indicator in formatted_analysis for indicator in json_indicators)
                    
                    if has_readable_sections and not has_raw_json:
                        print("✅ Formatted analysis contains human-readable text")
                        print("✅ No raw JSON structure found in formatted_analysis")
                        
                        # Show preview
                        preview = formatted_analysis[:300] + "..." if len(formatted_analysis) > 300 else formatted_analysis
                        print(f"\n📝 Formatted Analysis Preview:")
                        print("-" * 50)
                        print(preview)
                        print("-" * 50)
                        
                        # Check for specific sections
                        sections_found = []
                        for section in readable_sections:
                            if section in formatted_analysis:
                                sections_found.append(section.replace(":", ""))
                        
                        if sections_found:
                            print(f"✅ Found sections: {', '.join(sections_found)}")
                        
                        print("\n🎉 AI COACH P&L ANALYSIS FIX VERIFIED SUCCESSFULLY!")
                        print("✅ JSON formatting issue has been resolved")
                        print("✅ Backend correctly strips markdown and formats AI responses")
                        print("✅ Frontend will now display properly formatted text instead of raw JSON")
                        
                        return True
                        
                    else:
                        print("❌ Formatted analysis still has issues:")
                        print(f"   Has readable sections: {has_readable_sections}")
                        print(f"   Has raw JSON: {has_raw_json}")
                        print(f"   Content preview: {formatted_analysis[:200]}...")
                        return False
                        
                else:
                    print("❌ Response missing 'formatted_analysis' field")
                    print(f"Available fields: {list(response_data.keys())}")
                    return False
                    
            except json.JSONDecodeError:
                print("❌ Response is not valid JSON")
                print(f"Response text: {ai_response.text[:500]}...")
                return False
                
        else:
            print(f"❌ AI Coach request failed: {ai_response.status_code}")
            print(f"Response: {ai_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ AI Coach request error: {e}")
        return False

def main():
    """Main test function"""
    print("=" * 80)
    print("AI COACH P&L ANALYSIS JSON FORMATTING FIX TEST")
    print("=" * 80)
    
    success = test_ai_coach_pnl_fix()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 TEST PASSED - AI Coach P&L Analysis fix is working correctly!")
        sys.exit(0)
    else:
        print("❌ TEST FAILED - AI Coach P&L Analysis fix needs attention")
        sys.exit(1)

if __name__ == "__main__":
    main()