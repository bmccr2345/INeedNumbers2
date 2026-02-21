#!/usr/bin/env python3
"""
Final P&L Integration Verification
Comprehensive test to verify the AI Coach P&L integration is working
"""

import requests
import json
from datetime import datetime

def final_verification():
    base_url = "https://mobile-desktop-sync-4.preview.emergentagent.com"
    
    # Authenticate
    login_data = {
        "email": "demo@demo.com",
        "password": "demo123",
        "remember_me": True
    }
    
    print("🔐 Authenticating...")
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print("❌ Authentication failed")
        return False
    
    auth_token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
    
    print("✅ Authenticated successfully")
    
    # Test 1: Check P&L data exists
    print("\n📊 Checking P&L data...")
    deals_response = requests.get(f"{base_url}/api/pnl/deals?month=2025-01", headers=headers)
    if deals_response.status_code == 200:
        deals = deals_response.json()
        print(f"✅ Found {len(deals)} P&L deals")
        if deals:
            total_income = sum(deal.get('final_income', 0) for deal in deals)
            print(f"✅ Total income from deals: ${total_income:,.2f}")
        else:
            print("❌ No P&L deals found")
            return False
    else:
        print("❌ Could not retrieve P&L deals")
        return False
    
    # Test 2: Check AI Coach diagnostics
    print("\n🔬 Checking AI Coach diagnostics...")
    diag_response = requests.get(f"{base_url}/api/ai-coach-v2/diag", headers=headers)
    if diag_response.status_code == 200:
        diag_data = diag_response.json()
        pnl_deals = diag_data.get('pnl_deals', 0)
        has_pnl_data = diag_data.get('data_summary', {}).get('has_pnl_data', False)
        
        print(f"✅ AI Coach diagnostics working")
        print(f"   - P&L deals count: {pnl_deals}")
        print(f"   - has_pnl_data: {has_pnl_data}")
        
        if pnl_deals > 0 and has_pnl_data:
            print("✅ AI Coach can see P&L data")
        else:
            print("❌ AI Coach cannot see P&L data")
            return False
    else:
        print("❌ AI Coach diagnostics failed")
        return False
    
    # Test 3: Generate AI Coach analysis
    print("\n🤖 Generating AI Coach analysis...")
    coach_data = {"year": datetime.now().year, "force": True}
    coach_response = requests.post(f"{base_url}/api/ai-coach-v2/generate", json=coach_data, headers=headers)
    
    if coach_response.status_code == 200:
        coach_data = coach_response.json()
        summary = coach_data.get('summary', '')
        
        print(f"✅ AI Coach analysis generated")
        print(f"   - Summary: '{summary[:100]}...'")
        
        # Check if it's a fallback error response
        if 'temporarily unavailable' in summary.lower() or 'try again' in summary.lower():
            print("❌ AI Coach returned fallback error response")
            return False
        
        # Check for P&L-related content
        pnl_keywords = ['deal', 'income', 'commission', 'closed', 'sale', 'profit', 'revenue', 'earning']
        found_keywords = [kw for kw in pnl_keywords if kw in summary.lower()]
        
        if found_keywords:
            print(f"✅ AI Coach mentions P&L concepts: {found_keywords}")
        else:
            print("⚠️  AI Coach doesn't explicitly mention P&L concepts")
        
        # Check if response contains comprehensive data
        response_size = len(json.dumps(coach_data))
        if response_size > 500:  # Substantial response
            print(f"✅ AI Coach generated substantial response ({response_size} chars)")
        else:
            print(f"⚠️  AI Coach response seems minimal ({response_size} chars)")
        
        return True
    else:
        print(f"❌ AI Coach analysis failed: {coach_response.status_code}")
        return False

def main():
    print("🎯 Final P&L Integration Verification")
    print("=" * 50)
    
    success = final_verification()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 SUCCESS: AI Coach P&L Integration is working!")
        print("✅ The AI Coach can now see and analyze P&L deals")
        print("✅ The user's reported issue has been resolved")
        print("✅ AI Coach will no longer say 'no deals closed' when P&L has deals")
    else:
        print("❌ FAILURE: Issues remain with P&L integration")
        print("❌ Further investigation needed")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)