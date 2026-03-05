"""
Backend API Tests for Dashboard Features
Tests: health endpoint, P&L summary, commission history, cap-tracker progress
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pnl-verification.preview.emergentagent.com').rstrip('/')


class TestHealthEndpoint:
    """Health endpoint tests - should be accessible without auth"""
    
    def test_health_endpoint_returns_ok(self):
        """Test /api/health returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert "version" in data, "version field missing"
        assert "timestamp" in data, "timestamp field missing"
        print(f"PASS: Health endpoint returned: {data}")


class TestUnauthenticatedEndpoints:
    """Test endpoints that should require auth return 401"""
    
    def test_commission_history_requires_auth(self):
        """Commission history should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/commission/history", timeout=10)
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print(f"PASS: Commission history returns 401 without auth")
    
    def test_pnl_summary_requires_auth(self):
        """P&L summary should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/pnl/summary", timeout=10)
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print(f"PASS: P&L summary returns 401 without auth")
    
    def test_cap_tracker_progress_requires_auth(self):
        """Cap tracker progress should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/cap-tracker/progress", timeout=10)
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print(f"PASS: Cap tracker progress returns 401 without auth")


class TestAPIStructure:
    """Test API endpoint availability and structure"""
    
    def test_api_docs_available(self):
        """Check if API docs are accessible"""
        response = requests.get(f"{BASE_URL}/api/docs", timeout=10, allow_redirects=True)
        # Should either return 200 (docs) or redirect
        assert response.status_code in [200, 301, 302], f"API docs should be available, got {response.status_code}"
        print(f"PASS: API docs endpoint accessible (status: {response.status_code})")
    
    def test_api_openapi_json(self):
        """Check if OpenAPI JSON is available"""
        response = requests.get(f"{BASE_URL}/api/openapi.json", timeout=10)
        # May or may not be available
        if response.status_code == 200:
            data = response.json()
            assert "openapi" in data or "paths" in data, "Expected OpenAPI format"
            print(f"PASS: OpenAPI JSON available")
        else:
            print(f"INFO: OpenAPI JSON not accessible (status: {response.status_code})")


class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_preflight_allowed(self):
        """Test CORS preflight request"""
        headers = {
            "Origin": "https://pnl-verification.preview.emergentagent.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        response = requests.options(f"{BASE_URL}/api/health", headers=headers, timeout=10)
        # OPTIONS should succeed
        assert response.status_code in [200, 204], f"CORS preflight failed with {response.status_code}"
        print(f"PASS: CORS preflight returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
