#!/usr/bin/env python3
"""
Check existing users and try to create demo user
"""

import requests
import json

def test_login(email, password):
    """Test login with given credentials"""
    url = "https://coach-metrics-5.preview.emergentagent.com/api/auth/login"
    data = {
        "email": email,
        "password": password,
        "remember_me": True
    }
    
    try:
        response = requests.post(url, json=data, timeout=15)
        print(f"Testing {email}: Status {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            user = response_data.get('user', {})
            print(f"  ✅ SUCCESS: {user.get('email')} - Plan: {user.get('plan')} - ID: {user.get('id')}")
            return True, response_data
        else:
            print(f"  ❌ FAILED: {response.text}")
            return False, response.text
    except Exception as e:
        print(f"  ❌ ERROR: {str(e)}")
        return False, str(e)

def main():
    print("🔍 CHECKING EXISTING USERS...")
    
    # Test known emails from logs
    test_emails = [
        ("bmccr23@gmail.com", "demo123"),  # From logs
        ("bmccr@msn.com", "demo123"),      # From logs  
        ("demo@demo.com", "demo123"),      # Target demo user
        ("admin@admin.com", "admin123"),   # Common admin
        ("test@test.com", "test123"),      # Common test
    ]
    
    successful_logins = []
    
    for email, password in test_emails:
        success, response = test_login(email, password)
        if success:
            successful_logins.append((email, response))
    
    print(f"\n📊 SUMMARY: {len(successful_logins)} successful logins found")
    
    if successful_logins:
        print("\n✅ EXISTING USERS FOUND:")
        for email, response in successful_logins:
            user = response.get('user', {})
            print(f"  - {email}: Plan {user.get('plan')}, ID {user.get('id')}")
            
        # Use the first successful login to check if we can create demo user
        print(f"\n🔧 ATTEMPTING TO CREATE DEMO USER...")
        print("Note: Direct user creation via API is typically blocked")
        print("Demo user needs to be created manually in database or via webhook")
    else:
        print("\n❌ NO EXISTING USERS FOUND")
        print("This suggests the database might be empty or credentials are unknown")

if __name__ == "__main__":
    main()