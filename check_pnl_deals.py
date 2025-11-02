#!/usr/bin/env python3
"""
Check P&L deals structure to understand the status field issue
"""

import requests
import json

def check_pnl_deals():
    base_url = "https://realestate-numbers.preview.emergentagent.com"
    
    # Authenticate
    login_data = {
        "email": "demo@demo.com",
        "password": "demo123",
        "remember_me": True
    }
    
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    auth_token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
    
    print("🔍 Checking P&L deals structure...")
    deals_response = requests.get(f"{base_url}/api/pnl/deals?month=2025-01", headers=headers)
    
    if deals_response.status_code == 200:
        deals = deals_response.json()
        print(f"✅ Found {len(deals)} P&L deals")
        
        if deals:
            print(f"\n📋 Sample deal structure:")
            sample_deal = deals[0]
            print(json.dumps(sample_deal, indent=2))
            
            # Check if deals have status field
            status_values = []
            for deal in deals:
                status = deal.get('status', 'NO_STATUS_FIELD')
                if status not in status_values:
                    status_values.append(status)
            
            print(f"\n📊 Status field values found: {status_values}")
            
            # Check closing dates
            closing_dates = [deal.get('closing_date', 'NO_DATE') for deal in deals[:3]]
            print(f"📅 Sample closing dates: {closing_dates}")
            
        else:
            print("❌ No deals found")
    else:
        print(f"❌ Failed to get deals: {deals_response.status_code}")

if __name__ == "__main__":
    check_pnl_deals()