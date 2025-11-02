#!/usr/bin/env python3

import requests
import json

def test_closing_date_pdf():
    """Test the closing date PDF generation endpoint specifically"""
    
    base_url = "https://realestate-numbers.preview.emergentagent.com"
    
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
    
    print("🔍 Testing Closing Date Calculator PDF Generation...")
    
    try:
        response = requests.post(
            f"{base_url}/api/closing-date/generate-pdf",
            json=closing_date_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Content Type: {response.headers.get('content-type', 'unknown')}")
        
        if response.status_code == 200:
            print("✅ PDF Generation SUCCESS!")
            
            # Check if it's actually PDF content
            content = response.content
            if content.startswith(b'%PDF'):
                print("✅ Valid PDF content generated")
                print(f"✅ PDF size: {len(content)} bytes")
                
                # Save PDF for verification
                with open('/app/test_closing_timeline.pdf', 'wb') as f:
                    f.write(content)
                print("✅ PDF saved as test_closing_timeline.pdf")
            else:
                print("❌ Response is not PDF content")
                print(f"First 200 chars: {content[:200]}")
        else:
            print(f"❌ PDF Generation FAILED - Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Error text: {response.text[:500]}")
                
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

if __name__ == "__main__":
    test_closing_date_pdf()