#!/usr/bin/env python3
"""
Debug AI Coach Response - Check what the AI Coach is actually returning
"""

import requests
import json
from datetime import datetime

def debug_ai_coach():
    base_url = "https://authflow-fix-4.preview.emergentagent.com"
    
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
    
    print("🔍 Checking AI Coach diagnostics...")
    diag_response = requests.get(f"{base_url}/api/ai-coach-v2/diag", headers=headers)
    if diag_response.status_code == 200:
        diag_data = diag_response.json()
        print(f"✅ Diagnostics: {json.dumps(diag_data, indent=2)}")
    else:
        print(f"❌ Diagnostics failed: {diag_response.status_code}")
        return
    
    print("\n🤖 Generating AI Coach analysis...")
    coach_data = {"year": datetime.now().year, "force": True}
    coach_response = requests.post(f"{base_url}/api/ai-coach-v2/generate", json=coach_data, headers=headers)
    
    if coach_response.status_code == 200:
        coach_data = coach_response.json()
        print(f"✅ AI Coach Response: {json.dumps(coach_data, indent=2)}")
        
        # Check if P&L data is in the stats
        stats = coach_data.get('stats', {})
        if 'pnl' in stats or 'pnl_summary' in stats:
            print("✅ P&L data found in stats")
        else:
            print("❌ P&L data NOT found in stats")
            print(f"Stats keys: {list(stats.keys())}")
        
        # Check summary content
        summary = coach_data.get('summary', '')
        pnl_keywords = ['deal', 'income', 'commission', 'closed', 'sale', 'p&l', 'profit', 'revenue', 'earning']
        found_keywords = [kw for kw in pnl_keywords if kw in summary.lower()]
        
        if found_keywords:
            print(f"✅ P&L keywords found in summary: {found_keywords}")
        else:
            print("❌ No P&L keywords found in summary")
            print(f"Summary: '{summary}'")
            
    else:
        print(f"❌ AI Coach failed: {coach_response.status_code} - {coach_response.text}")

if __name__ == "__main__":
    debug_ai_coach()