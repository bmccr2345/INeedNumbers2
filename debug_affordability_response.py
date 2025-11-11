#!/usr/bin/env python3
"""
Debug AI Coach Affordability Response
Get the raw response to see what's happening
"""

import requests
import json

def debug_affordability_response():
    # Login
    login_data = {
        "email": "demo@demo.com",
        "password": "demo123",
        "remember_me": False
    }
    
    response = requests.post(
        "https://ai-coach-enhanced.preview.emergentagent.com/api/auth/login",
        json=login_data,
        timeout=15
    )
    
    if response.status_code != 200:
        print("Login failed")
        return
    
    cookies = response.cookies
    
    # Test affordability analysis
    affordability_data = {
        "context": "affordability_analysis",
        "affordability_data": {
            "home_price": 400000,
            "monthly_income": 10000,
            "down_payment": 80000,
            "interest_rate": 7.5,
            "dti_ratio": 28.0,
            "qualified": True,
            "loan_type": "CONVENTIONAL"
        }
    }
    
    response = requests.post(
        "https://ai-coach-enhanced.preview.emergentagent.com/api/ai-coach-v2/generate",
        json=affordability_data,
        cookies=cookies,
        timeout=30
    )
    
    print("🏠 AFFORDABILITY ANALYSIS RAW RESPONSE")
    print("=" * 60)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print("\nResponse Structure:")
            for key, value in data.items():
                print(f"  {key}: {type(value).__name__}")
            
            print(f"\nSummary:")
            print(f"  {data.get('summary', 'N/A')}")
            
            print(f"\nStats:")
            print(f"  {data.get('stats', 'N/A')}")
            
            print(f"\nActions:")
            for i, action in enumerate(data.get('actions', []), 1):
                print(f"  {i}. {action}")
            
            print(f"\nRisks:")
            for i, risk in enumerate(data.get('risks', []), 1):
                print(f"  {i}. {risk}")
            
            print(f"\nNext Inputs:")
            for i, input_item in enumerate(data.get('next_inputs', []), 1):
                print(f"  {i}. {input_item}")
            
            print(f"\nFull Response (first 1000 chars):")
            print(str(data)[:1000])
            
        except json.JSONDecodeError:
            print("Response is not JSON:")
            print(response.text[:1000])
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    debug_affordability_response()