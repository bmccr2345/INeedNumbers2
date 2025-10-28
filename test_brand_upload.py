#!/usr/bin/env python3

import requests
import base64
import io

def test_brand_upload():
    base_url = "https://agent-tracker-20.preview.emergentagent.com"
    
    # Step 1: Login to get cookies
    print("🔑 Logging in...")
    login_data = {
        "email": "demo@demo.com",
        "password": "demo123",
        "remember_me": False
    }
    
    login_response = requests.post(
        f"{base_url}/api/auth/login",
        json=login_data,
        timeout=15
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    print("✅ Login successful")
    auth_cookies = login_response.cookies
    print(f"🍪 Cookies received: {dict(auth_cookies)}")
    
    # Check if access_token cookie is present
    if 'access_token' in auth_cookies:
        print("✅ access_token cookie found")
    else:
        print("❌ access_token cookie NOT found")
    
    # Step 2: Test brand upload endpoint without authentication
    print("\n🔍 Testing brand upload without authentication...")
    no_auth_response = requests.post(f"{base_url}/api/brand/upload", timeout=15)
    print(f"No auth response: {no_auth_response.status_code}")
    if no_auth_response.status_code == 500:
        print("❌ CRITICAL: Getting 500 error instead of 401 - this confirms the bug")
        print(f"Error details: {no_auth_response.text[:200]}")
    
    # Step 3: Test brand upload with authentication
    print("\n📤 Testing brand upload with authentication...")
    
    # Create a simple 1x1 PNG image
    test_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="
    test_png_bytes = base64.b64decode(test_png_b64)
    
    files = {
        'file': ('test.png', io.BytesIO(test_png_bytes), 'image/png')
    }
    data = {
        'asset': 'headshot'
    }
    
    upload_response = requests.post(
        f"{base_url}/api/brand/upload",
        files=files,
        data=data,
        cookies=auth_cookies,
        timeout=15
    )
    
    print(f"Upload response status: {upload_response.status_code}")
    print(f"Upload response: {upload_response.text[:300]}")
    
    if upload_response.status_code == 200:
        print("✅ Brand upload working correctly!")
        return True
    elif upload_response.status_code == 500:
        if "ALLOWED_MIME" in upload_response.text:
            print("❌ CONFIRMED: ALLOWED_MIME is not defined error")
        elif "ASSET_MAX_MB" in upload_response.text:
            print("❌ CONFIRMED: ASSET_MAX_MB is not defined error")
        else:
            print("❌ Other 500 error")
        return False
    elif upload_response.status_code == 403:
        print("❌ CSRF protection issue")
        return False
    else:
        print(f"❌ Unexpected status: {upload_response.status_code}")
        return False

if __name__ == "__main__":
    print("🎨 Testing Brand Upload Fix...")
    success = test_brand_upload()
    if success:
        print("\n🎉 Brand upload is working!")
    else:
        print("\n❌ Brand upload has issues that need fixing")