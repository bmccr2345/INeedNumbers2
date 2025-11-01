#!/usr/bin/env python3

import requests
import json
import uuid

def test_closing_date_comprehensive():
    """Comprehensive test of all closing date calculator endpoints"""
    
    base_url = "https://debug-ineednumbers.preview.emergentagent.com"
    
    # First, authenticate
    print("🔐 Authenticating...")
    login_data = {
        "email": "bmccr23@gmail.com",
        "password": "Goosey23!!32",
        "remember_me": False
    }
    
    auth_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if auth_response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    auth_token = auth_response.json().get('access_token')
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}'
    }
    
    user_info = auth_response.json().get('user', {})
    print(f"✅ Authenticated as: {user_info.get('email')} ({user_info.get('plan')})")
    
    # Test data
    closing_date_data = {
        "title": "Closing Timeline - December 15, 2024",
        "inputs": {
            "underContractDate": "2024-11-01",
            "closingDate": "2024-12-15", 
            "pestInspectionDays": "7",
            "homeInspectionDays": "10",
            "dueDiligenceRepairRequestsDays": "14",
            "finalWalkthroughDays": "1",
            "appraisalDays": "7",
            "dueDiligenceStartDate": "2024-11-01",
            "dueDiligenceStopDate": "2024-11-10"
        },
        "timeline": [
            {
                "name": "Under Contract", 
                "date": "2024-11-01", 
                "type": "contract", 
                "description": "Contract was signed and executed", 
                "status": "completed"
            },
            {
                "name": "Pest Inspection", 
                "date": "2024-11-08", 
                "type": "inspection", 
                "description": "Professional pest inspection to identify any pest issues", 
                "status": "past-due"
            },
            {
                "name": "Home Inspection", 
                "date": "2024-11-11", 
                "type": "inspection", 
                "description": "Comprehensive home inspection to identify any property issues", 
                "status": "past-due"
            },
            {
                "name": "Closing Date", 
                "date": "2024-12-15", 
                "type": "closing", 
                "description": "Final closing and transfer of ownership", 
                "status": "upcoming"
            }
        ]
    }
    
    calculation_id = None
    
    # Test 1: Save Calculation
    print("\n📅 Test 1: Save Closing Date Calculation")
    try:
        response = requests.post(f"{base_url}/api/closing-date/save", json=closing_date_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            calculation_id = result.get('id')
            print(f"✅ Save successful - ID: {calculation_id}")
        else:
            print(f"❌ Save failed: {response.text}")
    except Exception as e:
        print(f"❌ Save error: {e}")
    
    # Test 2: Get Saved Calculations
    print("\n📅 Test 2: Get Saved Calculations")
    try:
        response = requests.get(f"{base_url}/api/closing-date/saved", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            count = result.get('count', 0)
            calculations = result.get('calculations', [])
            print(f"✅ Retrieved {count} saved calculations")
            
            if calculations:
                first_calc = calculations[0]
                print(f"✅ First calculation: {first_calc.get('title', 'No title')}")
                print(f"✅ Created: {first_calc.get('created_at', 'No date')}")
                
                # Use the first calculation ID for sharing test
                if not calculation_id:
                    calculation_id = first_calc.get('id')
        else:
            print(f"❌ Get saved failed: {response.text}")
    except Exception as e:
        print(f"❌ Get saved error: {e}")
    
    # Test 3: Get Shared Calculation (Public Access)
    print("\n📅 Test 3: Get Shared Calculation")
    if calculation_id:
        try:
            # Test without authentication (public access)
            response = requests.get(f"{base_url}/api/closing-date/shared/{calculation_id}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Shared calculation retrieved: {result.get('title', 'No title')}")
                print("✅ Public access working (no auth required)")
                
                # Verify user_id is removed for privacy
                if 'user_id' not in result:
                    print("✅ User ID properly removed for privacy")
                else:
                    print("⚠️  User ID still present in shared calculation")
            else:
                print(f"❌ Get shared failed: {response.text}")
        except Exception as e:
            print(f"❌ Get shared error: {e}")
    else:
        print("⚠️  No calculation ID available for sharing test")
    
    # Test 4: Generate PDF
    print("\n📅 Test 4: Generate PDF")
    try:
        response = requests.post(f"{base_url}/api/closing-date/generate-pdf", json=closing_date_data)
        print(f"Status: {response.status_code}")
        print(f"Content Type: {response.headers.get('content-type', 'unknown')}")
        
        if response.status_code == 200:
            content = response.content
            if content.startswith(b'%PDF'):
                print(f"✅ PDF generated successfully - {len(content)} bytes")
                
                # Save PDF
                with open('/app/test_closing_timeline_comprehensive.pdf', 'wb') as f:
                    f.write(content)
                print("✅ PDF saved for verification")
            else:
                print("❌ Response is not PDF content")
        else:
            print(f"❌ PDF generation failed: {response.text}")
    except Exception as e:
        print(f"❌ PDF generation error: {e}")
    
    # Test 5: Generate PDF with Plan Preview (Branded)
    print("\n📅 Test 5: Generate PDF with STARTER Plan Preview")
    try:
        cookies = {'plan_preview': 'STARTER'}
        response = requests.post(
            f"{base_url}/api/closing-date/generate-pdf", 
            json=closing_date_data, 
            headers=headers,
            cookies=cookies
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.content
            if content.startswith(b'%PDF'):
                print(f"✅ Branded PDF generated successfully - {len(content)} bytes")
                
                # Save branded PDF
                with open('/app/test_closing_timeline_branded.pdf', 'wb') as f:
                    f.write(content)
                print("✅ Branded PDF saved for verification")
            else:
                print("❌ Response is not PDF content")
        else:
            print(f"❌ Branded PDF generation failed: {response.text}")
    except Exception as e:
        print(f"❌ Branded PDF generation error: {e}")
    
    # Test 6: Authentication Requirements
    print("\n📅 Test 6: Authentication Requirements")
    
    # Test save without auth
    try:
        response = requests.post(f"{base_url}/api/closing-date/save", json=closing_date_data)
        if response.status_code == 401:
            print("✅ Save endpoint properly requires authentication")
        else:
            print(f"❌ Save endpoint should require auth - got {response.status_code}")
    except Exception as e:
        print(f"❌ Auth test error: {e}")
    
    # Test get saved without auth
    try:
        response = requests.get(f"{base_url}/api/closing-date/saved")
        if response.status_code == 401:
            print("✅ Get saved endpoint properly requires authentication")
        else:
            print(f"❌ Get saved endpoint should require auth - got {response.status_code}")
    except Exception as e:
        print(f"❌ Auth test error: {e}")
    
    print("\n🎯 CLOSING DATE CALCULATOR COMPREHENSIVE TEST COMPLETE")

if __name__ == "__main__":
    test_closing_date_comprehensive()