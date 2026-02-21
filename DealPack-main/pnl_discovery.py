#!/usr/bin/env python3
"""
P&L Tracker Backend API Testing Script - Simplified Version
Test P&L endpoints to understand their current state
"""

import requests
import json

def test_pnl_endpoint(endpoint, method="GET", data=None, auth_token=None):
    """Test a single P&L endpoint"""
    base_url = "https://mobile-desktop-sync-4.preview.emergentagent.com"
    url = f"{base_url}/{endpoint}"
    
    headers = {'Content-Type': 'application/json'}
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    print(f"\n🔍 Testing {method} {endpoint}")
    print(f"   URL: {url}")
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=15)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=15)
        elif method == 'DELETE':
            response = requests.delete(url, json=data, headers=headers, timeout=15)
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:500]}...")
        
        return response.status_code, response.text
        
    except Exception as e:
        print(f"   Error: {str(e)}")
        return None, str(e)

def main():
    print("🏢 P&L TRACKER API ENDPOINT DISCOVERY")
    print("=" * 50)
    
    # First, try to authenticate
    print("\n📋 Step 1: Authentication Test")
    
    # Try different credentials
    credentials = [
        {"email": "demo@demo.com", "password": "demo123"},
        {"email": "bmccr23@gmail.com", "password": "demo123"},
    ]
    
    auth_token = None
    for creds in credentials:
        status, response = test_pnl_endpoint(
            "api/auth/login", 
            "POST", 
            {**creds, "remember_me": True}
        )
        
        if status == 200:
            try:
                response_data = json.loads(response)
                if 'access_token' in response_data:
                    auth_token = response_data['access_token']
                    user = response_data.get('user', {})
                    print(f"   ✅ Authenticated as: {user.get('email')} ({user.get('plan')})")
                    break
            except:
                pass
    
    if not auth_token:
        print("   ❌ Authentication failed, testing without auth")
    
    # Test P&L endpoints
    print("\n📋 Step 2: P&L Endpoint Discovery")
    
    pnl_endpoints = [
        ("api/pnl/categories", "GET"),
        ("api/pnl/lead-sources", "GET"),
        ("api/pnl/deals", "GET"),
        ("api/pnl/deals?month=2025-09", "GET"),
        ("api/pnl/expenses", "GET"),
        ("api/pnl/expenses?month=2025-09", "GET"),
        ("api/pnl/budgets?month=2025-09", "GET"),
        ("api/pnl/summary?month=2025-09", "GET"),
        ("api/pnl/export?month=2025-09&format=excel", "GET"),
    ]
    
    results = []
    for endpoint, method in pnl_endpoints:
        status, response = test_pnl_endpoint(endpoint, method, auth_token=auth_token)
        results.append((endpoint, method, status, response[:200] if response else ""))
    
    # Test creating a deal
    print("\n📋 Step 3: Test Deal Creation")
    deal_data = {
        "house_address": "123 Test St",
        "amount_sold_for": 500000,
        "commission_percent": 6.0,
        "split_percent": 50.0,
        "team_brokerage_split_percent": 20.0,
        "lead_source": "Referral - Past Client",
        "closing_date": "2025-09-15"
    }
    
    status, response = test_pnl_endpoint("api/pnl/deals", "POST", deal_data, auth_token)
    results.append(("api/pnl/deals", "POST", status, response[:200] if response else ""))
    
    # Test creating an expense
    print("\n📋 Step 4: Test Expense Creation")
    expense_data = {
        "date": "2025-09-10",
        "category": "Marketing & Advertising",
        "amount": 250.00,
        "description": "Facebook ads campaign"
    }
    
    status, response = test_pnl_endpoint("api/pnl/expenses", "POST", expense_data, auth_token)
    results.append(("api/pnl/expenses", "POST", status, response[:200] if response else ""))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 P&L ENDPOINT TEST SUMMARY")
    print("=" * 50)
    
    success_count = 0
    total_count = len(results)
    
    for endpoint, method, status, response in results:
        if status and status < 400:
            success_count += 1
            print(f"✅ {method} {endpoint} - Status: {status}")
        elif status == 401:
            print(f"🔒 {method} {endpoint} - Status: {status} (Auth Required)")
        elif status == 402:
            print(f"💳 {method} {endpoint} - Status: {status} (Pro Plan Required)")
        else:
            print(f"❌ {method} {endpoint} - Status: {status}")
    
    print(f"\n📈 Success Rate: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    if auth_token:
        print("✅ Authentication successful")
    else:
        print("❌ Authentication failed")

if __name__ == "__main__":
    main()