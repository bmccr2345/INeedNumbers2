#!/usr/bin/env python3
"""
Verify login with correct password
"""

import requests
import json

def test_login_with_correct_password():
    base_url = "https://deployment-fix-15.preview.emergentagent.com"
    
    print("🔐 Testing login with correct password...")
    
    # Test with the actual correct password
    correct_request = {
        "email": "demo@demo.com",
        "password": "demo123",  # This is the actual password
        "remember_me": False
    }
    
    response = requests.post(
        f"{base_url}/api/auth/login",
        json=correct_request,
        timeout=15
    )
    
    print(f"✅ Response status: {response.status_code}")
    print(f"✅ Response headers: {dict(response.headers)}")
    
    try:
        response_data = response.json()
        print(f"✅ Response JSON: {json.dumps(response_data, indent=2)}")
    except:
        print(f"⚠️  Response text: {response.text}")
    
    if response.status_code == 200:
        print("🎉 LOGIN SUCCESSFUL with correct password 'demo123'")
        
        # Check for Set-Cookie header
        set_cookie = response.headers.get('Set-Cookie', '')
        if set_cookie:
            print(f"✅ Set-Cookie header: {set_cookie}")
        else:
            print("❌ No Set-Cookie header found")
            
    else:
        print(f"❌ LOGIN FAILED even with correct password")

if __name__ == "__main__":
    test_login_with_correct_password()