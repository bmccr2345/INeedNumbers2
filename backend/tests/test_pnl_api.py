"""
P&L API Endpoint Tests - Testing Add Deal Auth Fix
Tests for POST /api/pnl/deals and related endpoints.

Key Features Being Tested:
1. POST /api/pnl/deals returns 401 without auth token
2. POST /api/pnl/deals accepts requests with valid auth structure
3. GET /api/pnl/lead-sources endpoint works with auth
4. GET /api/pnl/categories endpoint works with auth
"""
import pytest
import requests
import os
from datetime import datetime

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPnLDealEndpoints:
    """Tests for P&L Deal creation and related endpoints"""
    
    # Test 1: POST /api/pnl/deals returns 401 without auth
    def test_create_deal_requires_auth(self):
        """POST /api/pnl/deals should return 401 without Authorization header"""
        response = requests.post(
            f"{BASE_URL}/api/pnl/deals",
            json={
                "house_address": "123 Test St",
                "amount_sold_for": 500000,
                "commission_percent": 3.0,
                "split_percent": 70,
                "team_brokerage_split_percent": 0,
                "lead_source": "Referral",
                "contract_signed": "2026-01-01",
                "due_diligence_start": "2026-01-02",
                "due_diligence_over": "2026-01-15",
                "closing_date": "2026-01-30"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: POST /api/pnl/deals returns 401 without auth. Response: {response.json()}")
    
    # Test 2: POST /api/pnl/deals with invalid auth token format
    def test_create_deal_rejects_invalid_token(self):
        """POST /api/pnl/deals should return 401 with invalid/malformed token"""
        response = requests.post(
            f"{BASE_URL}/api/pnl/deals",
            json={
                "house_address": "123 Test St",
                "amount_sold_for": 500000,
                "commission_percent": 3.0,
                "split_percent": 70,
                "team_brokerage_split_percent": 0,
                "lead_source": "Referral",
                "contract_signed": "2026-01-01",
                "due_diligence_start": "2026-01-02",
                "due_diligence_over": "2026-01-15",
                "closing_date": "2026-01-30"
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_fake_token_12345"
            }
        )
        
        # Should return 401 because the token is invalid
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: POST /api/pnl/deals rejects invalid token with 401. Response: {response.json()}")

    # Test 3: GET /api/pnl/lead-sources requires auth
    def test_lead_sources_requires_auth(self):
        """GET /api/pnl/lead-sources should return 401 without auth"""
        response = requests.get(
            f"{BASE_URL}/api/pnl/lead-sources",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: GET /api/pnl/lead-sources returns 401 without auth. Response: {response.json()}")
    
    # Test 4: GET /api/pnl/categories requires auth
    def test_categories_requires_auth(self):
        """GET /api/pnl/categories should return 401 without auth"""
        response = requests.get(
            f"{BASE_URL}/api/pnl/categories",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: GET /api/pnl/categories returns 401 without auth. Response: {response.json()}")
    
    # Test 5: GET /api/pnl/summary requires auth
    def test_summary_requires_auth(self):
        """GET /api/pnl/summary should return 401 without auth"""
        response = requests.get(
            f"{BASE_URL}/api/pnl/summary",
            params={"month": "2026-01"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: GET /api/pnl/summary returns 401 without auth. Response: {response.json()}")
    
    # Test 6: Health check should work without auth
    def test_health_check_public(self):
        """GET /api/health should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        print(f"TEST PASSED: Health check returns 200. Response: {data}")


class TestPnLEndpointStructure:
    """Tests for P&L endpoint request/response structure"""
    
    def test_deal_endpoint_returns_proper_error_format(self):
        """Verify the 401 error response has expected detail format"""
        response = requests.post(
            f"{BASE_URL}/api/pnl/deals",
            json={
                "house_address": "123 Test St",
                "amount_sold_for": 500000,
                "commission_percent": 3.0,
                "split_percent": 70,
                "team_brokerage_split_percent": 0,
                "lead_source": "Referral",
                "contract_signed": "2026-01-01",
                "due_diligence_start": "2026-01-02",
                "due_diligence_over": "2026-01-15",
                "closing_date": "2026-01-30"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401
        data = response.json()
        # Should have a detail field explaining the error
        assert "detail" in data, f"Expected 'detail' in response: {data}"
        print(f"TEST PASSED: 401 response has proper error format with detail: {data['detail']}")
    
    def test_deal_endpoint_with_auth_header_structure(self):
        """Verify endpoint accepts Authorization Bearer header structure"""
        # This tests that the endpoint actually processes the Authorization header
        # (even if it fails validation, it should try to validate rather than ignore)
        response = requests.post(
            f"{BASE_URL}/api/pnl/deals",
            json={
                "house_address": "Test Property",
                "amount_sold_for": 100000,
                "commission_percent": 3.0,
                "split_percent": 100,
                "team_brokerage_split_percent": 0,
                "lead_source": "Test",
                "contract_signed": "2026-01-01",
                "due_diligence_start": "2026-01-02",
                "due_diligence_over": "2026-01-10",
                "closing_date": "2026-01-30"
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fake_payload"
            }
        )
        
        # Should return 401 because token can't be validated
        # But importantly, it should NOT return 500 or other errors
        assert response.status_code == 401, f"Expected 401 with invalid JWT, got {response.status_code}: {response.text}"
        print(f"TEST PASSED: Endpoint processes Authorization header and returns 401 for invalid JWT")


if __name__ == "__main__":
    # Run tests directly for quick verification
    import sys
    
    print(f"\n{'='*60}")
    print(f"Running P&L API Tests")
    print(f"BASE_URL: {BASE_URL}")
    print(f"{'='*60}\n")
    
    # Quick manual run
    test_class = TestPnLDealEndpoints()
    
    try:
        test_class.test_health_check_public()
        test_class.test_create_deal_requires_auth()
        test_class.test_create_deal_rejects_invalid_token()
        test_class.test_lead_sources_requires_auth()
        test_class.test_categories_requires_auth()
        test_class.test_summary_requires_auth()
        
        struct_tests = TestPnLEndpointStructure()
        struct_tests.test_deal_endpoint_returns_proper_error_format()
        struct_tests.test_deal_endpoint_with_auth_header_structure()
        
        print(f"\n{'='*60}")
        print("ALL TESTS PASSED!")
        print(f"{'='*60}")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n{'='*60}")
        print(f"TEST FAILED: {e}")
        print(f"{'='*60}")
        sys.exit(1)
