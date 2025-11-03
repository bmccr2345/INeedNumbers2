#!/usr/bin/env python3

import requests
import json

def test_plan_gating():
    """Test plan-based feature gating for closing date calculator"""
    
    base_url = "https://authflow-fix-4.preview.emergentagent.com"
    
    # Test data
    closing_date_data = {
        "title": "FREE User Test Timeline",
        "inputs": {
            "underContractDate": "2024-11-01",
            "closingDate": "2024-12-15", 
            "pestInspectionDays": "7",
            "homeInspectionDays": "10"
        },
        "timeline": [
            {
                "name": "Under Contract", 
                "date": "2024-11-01", 
                "type": "contract", 
                "description": "Contract executed", 
                "status": "completed"
            },
            {
                "name": "Closing Date", 
                "date": "2024-12-15", 
                "type": "closing", 
                "description": "Final closing", 
                "status": "upcoming"
            }
        ]
    }
    
    print("🔍 Testing Plan-Based Feature Gating...")
    
    # Test with PRO user (should work)
    print("\n📅 Test 1: PRO User (Should Work)")
    pro_login_data = {
        "email": "bmccr23@gmail.com",
        "password": "Goosey23!!32",
        "remember_me": False
    }
    
    auth_response = requests.post(f"{base_url}/api/auth/login", json=pro_login_data)
    if auth_response.status_code == 200:
        auth_token = auth_response.json().get('access_token')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
        
        user_info = auth_response.json().get('user', {})
        print(f"✅ Authenticated as PRO user: {user_info.get('email')} ({user_info.get('plan')})")
        
        # Try to save calculation
        response = requests.post(f"{base_url}/api/closing-date/save", json=closing_date_data, headers=headers)
        if response.status_code == 200:
            print("✅ PRO user can save closing date calculations")
        else:
            print(f"❌ PRO user blocked: {response.status_code} - {response.text}")
    else:
        print("❌ PRO user authentication failed")
    
    # Test with plan preview cookie (FREE user with STARTER preview)
    print("\n📅 Test 2: Plan Preview Cookie (FREE → STARTER)")
    
    # Create a test user or use existing FREE user
    # For this test, we'll simulate by using plan preview cookie
    cookies = {'plan_preview': 'STARTER'}
    
    # Test PDF generation with plan preview (should show branding)
    response = requests.post(
        f"{base_url}/api/closing-date/generate-pdf", 
        json=closing_date_data,
        cookies=cookies
    )
    
    if response.status_code == 200:
        content = response.content
        if content.startswith(b'%PDF'):
            print(f"✅ Plan preview enables PDF generation - {len(content)} bytes")
            
            # Save PDF to check if it's branded
            with open('/app/test_closing_timeline_plan_preview.pdf', 'wb') as f:
                f.write(content)
            print("✅ Plan preview PDF saved for verification")
        else:
            print("❌ Plan preview PDF generation failed")
    else:
        print(f"❌ Plan preview PDF generation failed: {response.status_code}")
    
    print("\n🎯 PLAN GATING TEST COMPLETE")
    print("Note: To fully test FREE user blocking, we would need a FREE user account.")
    print("The plan gating logic is implemented in check_plan_limits() function.")

if __name__ == "__main__":
    test_plan_gating()