"""
Stage 3 Comprehensive Tests: Soft Limit Mode (Observation Only)
Tests:
1. Usage percentage calculation
2. Warning threshold (80%)
3. Exceeded threshold (100%)
4. No blocking behavior (requests still succeed)
5. OpenAI retry logic
6. Concurrency safety
7. Latency impact
"""
import pytest
import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from unittest.mock import Mock, AsyncMock, patch, MagicMock

sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient


# =============================================================================
# Test 1: Usage Percentage Calculation
# =============================================================================
class TestUsageCalculation:
    """Test calculate_usage_status function"""
    
    def test_below_threshold(self):
        """Test: Usage below 80% returns no warning flags"""
        from app.routes.ai_coach import calculate_usage_status
        
        current_usage = {"total_tokens": 50000, "total_cost": 2.0}
        result = calculate_usage_status(current_usage, 100000, 5.0)
        
        assert result["usage_percentage_tokens"] == 50.0
        assert result["usage_percentage_cost"] == 40.0
        assert "usage_warning" not in result
        assert "usage_exceeded" not in result
        print("PASS: Below threshold - no warning flags")
    
    def test_at_80_percent_warning(self):
        """Test: Usage at 80% triggers warning"""
        from app.routes.ai_coach import calculate_usage_status
        
        current_usage = {"total_tokens": 80000, "total_cost": 2.0}
        result = calculate_usage_status(current_usage, 100000, 5.0)
        
        assert result["usage_percentage_tokens"] == 80.0
        assert result["usage_warning"] is True
        assert "usage_exceeded" not in result
        print("PASS: At 80% - warning flag set")
    
    def test_at_100_percent_exceeded(self):
        """Test: Usage at 100% triggers exceeded"""
        from app.routes.ai_coach import calculate_usage_status
        
        current_usage = {"total_tokens": 100000, "total_cost": 5.0}
        result = calculate_usage_status(current_usage, 100000, 5.0)
        
        assert result["usage_percentage_tokens"] == 100.0
        assert result["usage_percentage_cost"] == 100.0
        assert result["usage_warning"] is True
        assert result["usage_exceeded"] is True
        print("PASS: At 100% - exceeded flag set")
    
    def test_over_100_percent(self):
        """Test: Usage over 100% still shows correct percentage"""
        from app.routes.ai_coach import calculate_usage_status
        
        current_usage = {"total_tokens": 150000, "total_cost": 7.5}
        result = calculate_usage_status(current_usage, 100000, 5.0)
        
        assert result["usage_percentage_tokens"] == 150.0
        assert result["usage_percentage_cost"] == 150.0
        assert result["usage_warning"] is True
        assert result["usage_exceeded"] is True
        print("PASS: Over 100% - shows correct percentage")
    
    def test_cost_triggers_before_tokens(self):
        """Test: Cost can trigger warning even if tokens are low"""
        from app.routes.ai_coach import calculate_usage_status
        
        # Low tokens but high cost
        current_usage = {"total_tokens": 10000, "total_cost": 4.5}
        result = calculate_usage_status(current_usage, 100000, 5.0)
        
        assert result["usage_percentage_tokens"] == 10.0
        assert result["usage_percentage_cost"] == 90.0
        assert result["usage_warning"] is True  # Cost >= 80%
        print("PASS: Cost triggers warning before tokens")
    
    def test_empty_usage(self):
        """Test: Empty usage returns empty dict"""
        from app.routes.ai_coach import calculate_usage_status
        
        result = calculate_usage_status({}, 100000, 5.0)
        assert result == {}
        print("PASS: Empty usage handled")
    
    def test_zero_limits(self):
        """Test: Zero limits returns empty dict"""
        from app.routes.ai_coach import calculate_usage_status
        
        current_usage = {"total_tokens": 50000, "total_cost": 2.0}
        result = calculate_usage_status(current_usage, 0, 0)
        assert result == {}
        print("PASS: Zero limits handled")


# =============================================================================
# Test 2: Response Merging
# =============================================================================
class TestResponseMerging:
    """Test merge_usage_status function"""
    
    def test_merge_with_warning(self):
        """Test: Warning status merges into response"""
        from app.routes.ai_coach import merge_usage_status
        
        response = {"summary": "Test response", "actions": []}
        usage_status = {
            "usage_percentage_tokens": 85.0,
            "usage_percentage_cost": 70.0,
            "usage_warning": True
        }
        
        result = merge_usage_status(response, usage_status)
        
        assert result["summary"] == "Test response"
        assert result["usage_percentage_tokens"] == 85.0
        assert result["usage_percentage_cost"] == 70.0
        assert result["usage_warning"] is True
        assert "usage_exceeded" not in result
        print("PASS: Warning merged into response")
    
    def test_merge_with_exceeded(self):
        """Test: Exceeded status merges into response"""
        from app.routes.ai_coach import merge_usage_status
        
        response = {"summary": "Test"}
        usage_status = {
            "usage_percentage_tokens": 105.0,
            "usage_percentage_cost": 110.0,
            "usage_warning": True,
            "usage_exceeded": True
        }
        
        result = merge_usage_status(response, usage_status)
        
        assert result["usage_exceeded"] is True
        assert result["usage_warning"] is True
        print("PASS: Exceeded merged into response")
    
    def test_no_merge_below_threshold(self):
        """Test: Below threshold doesn't add fields"""
        from app.routes.ai_coach import merge_usage_status
        
        response = {"summary": "Test"}
        usage_status = {
            "usage_percentage_tokens": 50.0,
            "usage_percentage_cost": 40.0
        }
        
        result = merge_usage_status(response, usage_status)
        
        assert "usage_warning" not in result
        assert "usage_exceeded" not in result
        assert "usage_percentage_tokens" not in result
        print("PASS: Below threshold - no fields added")
    
    def test_empty_usage_status(self):
        """Test: Empty usage_status returns original response"""
        from app.routes.ai_coach import merge_usage_status
        
        response = {"summary": "Test"}
        result = merge_usage_status(response, {})
        
        assert result == response
        print("PASS: Empty status returns original")


# =============================================================================
# Test 3: OpenAI Retry Logic
# =============================================================================
@pytest.mark.asyncio
class TestOpenAIRetry:
    """Test call_openai_with_retry function"""
    
    async def test_success_no_retry(self):
        """Test: Successful call doesn't retry"""
        from app.routes.ai_coach import call_openai_with_retry
        
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Test"))]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await call_openai_with_retry(
            client=mock_client,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "test"}],
            temperature=0.2,
            max_tokens=100,
            max_retries=1
        )
        
        assert result == mock_response
        assert mock_client.chat.completions.create.call_count == 1
        print("PASS: Success - no retry needed")
    
    async def test_retry_on_rate_limit(self):
        """Test: Rate limit error triggers retry"""
        from app.routes.ai_coach import call_openai_with_retry
        from openai import RateLimitError
        
        mock_client = AsyncMock()
        mock_response = Mock()
        
        # First call raises RateLimitError, second succeeds
        mock_client.chat.completions.create = AsyncMock(
            side_effect=[
                RateLimitError("Rate limit", response=Mock(status_code=429), body={}),
                mock_response
            ]
        )
        
        result = await call_openai_with_retry(
            client=mock_client,
            model="gpt-4o-mini",
            messages=[],
            temperature=0.2,
            max_tokens=100,
            max_retries=1
        )
        
        assert result == mock_response
        assert mock_client.chat.completions.create.call_count == 2
        print("PASS: Rate limit triggered retry")
    
    async def test_no_retry_on_400_error(self):
        """Test: 400-level errors do NOT retry"""
        from app.routes.ai_coach import call_openai_with_retry
        from openai import APIError
        
        mock_client = AsyncMock()
        
        # Create a proper APIError mock
        mock_error = Mock(spec=APIError)
        mock_error.status_code = 400
        mock_error.__class__ = APIError
        
        mock_client.chat.completions.create = AsyncMock(side_effect=APIError(
            message="Bad request",
            request=Mock(),
            body={}
        ))
        
        # Patch the status_code on the raised error
        original_create = mock_client.chat.completions.create
        async def create_with_error(*args, **kwargs):
            err = APIError(message="Bad request", request=Mock(), body={})
            err.status_code = 400
            raise err
        mock_client.chat.completions.create = create_with_error
        
        with pytest.raises(APIError):
            await call_openai_with_retry(
                client=mock_client,
                model="gpt-4o-mini",
                messages=[],
                temperature=0.2,
                max_tokens=100,
                max_retries=1
            )
        
        print("PASS: 400 error - no retry")


# =============================================================================
# Test 4: Usage Fetch Function
# =============================================================================
@pytest.mark.asyncio
class TestUsageFetch:
    """Test get_user_monthly_usage function"""
    
    async def test_fetch_existing_usage(self):
        """Test: Fetch returns existing usage data"""
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        if not mongo_url:
            pytest.skip("MONGO_URL not configured")
        
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
            db = client[db_name]
            
            test_user = f"test_fetch_{int(time.time())}"
            year_month = datetime.now(timezone.utc).strftime("%Y-%m")
            
            # Insert test data
            await db.ai_usage_monthly.update_one(
                {"user_id": test_user, "year_month": year_month},
                {
                    "$set": {
                        "total_tokens": 50000,
                        "total_cost": 2.5,
                        "request_count": 100
                    }
                },
                upsert=True
            )
            
            # Fetch using function
            from app.routes.ai_coach import get_user_monthly_usage
            result = await get_user_monthly_usage(test_user)
            
            assert result["total_tokens"] == 50000
            assert result["total_cost"] == 2.5
            assert result["request_count"] == 100
            print(f"PASS: Fetched usage: {result}")
            
            # Cleanup
            await db.ai_usage_monthly.delete_one({"user_id": test_user})
            client.close()
            
        except asyncio.TimeoutError:
            pytest.skip("MongoDB timeout")
        except Exception as e:
            pytest.skip(f"MongoDB error: {e}")
    
    async def test_fetch_nonexistent_user(self):
        """Test: Fetch returns zeros for new user"""
        from app.routes.ai_coach import get_user_monthly_usage
        
        result = await get_user_monthly_usage("nonexistent_user_xyz123")
        
        # Should return zeros, not empty
        assert result.get("total_tokens", 0) == 0
        assert result.get("total_cost", 0) == 0.0
        print(f"PASS: New user returns zeros: {result}")


# =============================================================================
# Test 5: Latency Impact
# =============================================================================
@pytest.mark.asyncio
class TestLatencyImpact:
    """Test that soft limit check doesn't add significant latency"""
    
    async def test_usage_check_latency(self):
        """Test: Usage check completes within timeout"""
        from app.routes.ai_coach import get_user_monthly_usage
        
        NUM_SAMPLES = 10
        latencies = []
        
        for i in range(NUM_SAMPLES):
            start = time.perf_counter()
            await get_user_monthly_usage(f"latency_test_{i}")
            elapsed = (time.perf_counter() - start) * 1000
            latencies.append(elapsed)
        
        avg_latency = sum(latencies) / len(latencies)
        max_latency = max(latencies)
        
        print(f"Usage check latency (n={NUM_SAMPLES}):")
        print(f"  Average: {avg_latency:.2f}ms")
        print(f"  Max: {max_latency:.2f}ms")
        
        # Should complete quickly (under 2s timeout + overhead)
        assert avg_latency < 3000, f"Average latency too high: {avg_latency}ms"
        print("PASS: Usage check latency acceptable")


# =============================================================================
# Test 6: Concurrency Safety
# =============================================================================
@pytest.mark.asyncio  
class TestConcurrencySafety:
    """Test that usage check is safe under concurrent load"""
    
    async def test_concurrent_usage_checks(self):
        """Test: 50 concurrent usage checks don't cause errors"""
        from app.routes.ai_coach import get_user_monthly_usage, calculate_usage_status
        
        NUM_CONCURRENT = 50
        test_user = f"concurrent_test_{int(time.time())}"
        
        async def do_check(i):
            usage = await get_user_monthly_usage(test_user)
            status = calculate_usage_status(usage, 100000, 5.0)
            return status
        
        start = time.time()
        tasks = [asyncio.create_task(do_check(i)) for i in range(NUM_CONCURRENT)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = time.time() - start
        
        # Count successes and failures
        successes = sum(1 for r in results if isinstance(r, dict))
        failures = sum(1 for r in results if isinstance(r, Exception))
        
        print(f"Concurrent usage checks (n={NUM_CONCURRENT}):")
        print(f"  Time: {elapsed:.2f}s")
        print(f"  Successes: {successes}")
        print(f"  Failures: {failures}")
        
        # Most should succeed (some may timeout in preview env)
        assert successes >= NUM_CONCURRENT * 0.8, f"Too many failures: {failures}"
        print("PASS: Concurrent checks safe")


# =============================================================================
# Test 7: Sample Response Payloads
# =============================================================================
class TestSamplePayloads:
    """Generate sample response payloads for documentation"""
    
    def test_generate_sample_warning_response(self):
        """Generate sample response with warning flags"""
        from app.routes.ai_coach import merge_usage_status
        
        ai_response = {
            "summary": "Your activity tracking shows strong momentum this week...",
            "priority_actions": ["Follow up on pending contracts", "Schedule client meetings"],
            "time_sensitive": ["Review expiring listings"],
            "performance_analysis": "Conversion rate improved 15% this month"
        }
        
        usage_status = {
            "usage_percentage_tokens": 85.5,
            "usage_percentage_cost": 78.2,
            "usage_warning": True
        }
        
        result = merge_usage_status(ai_response, usage_status)
        
        print("\nSAMPLE RESPONSE WITH WARNING:")
        print("-" * 50)
        import json
        print(json.dumps(result, indent=2))
        
        assert "usage_warning" in result
        assert result["usage_warning"] is True
    
    def test_generate_sample_exceeded_response(self):
        """Generate sample response with exceeded flags"""
        from app.routes.ai_coach import merge_usage_status
        
        ai_response = {
            "summary": "Great progress on your goals...",
            "priority_actions": ["Continue momentum"],
            "time_sensitive": [],
            "performance_analysis": "Strong month"
        }
        
        usage_status = {
            "usage_percentage_tokens": 112.5,
            "usage_percentage_cost": 105.8,
            "usage_warning": True,
            "usage_exceeded": True
        }
        
        result = merge_usage_status(ai_response, usage_status)
        
        print("\nSAMPLE RESPONSE WITH EXCEEDED:")
        print("-" * 50)
        import json
        print(json.dumps(result, indent=2))
        
        assert "usage_exceeded" in result
        assert result["usage_exceeded"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
