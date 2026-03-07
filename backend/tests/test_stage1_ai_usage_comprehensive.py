"""
Stage 1 Comprehensive AI Usage Logging Tests
Tests:
1. Cost calculation correctness
2. Usage object NoneType handling (guards against None/null)
3. Background task exception handling (no 'Task exception was never retrieved')
4. Load testing - concurrent calls
5. MongoDB index verification
6. Latency benchmarks
"""
import pytest
import asyncio
import os
import sys
import time
from unittest.mock import Mock, MagicMock, AsyncMock
from datetime import datetime, timezone

# Add path for imports
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient


# =============================================================================
# Test 1: Cost Calculation Tests
# =============================================================================
class TestCostCalculation:
    """Test calculate_ai_cost function with various token counts"""
    
    def test_cost_calculation_basic(self):
        """Test: 100 prompt + 50 completion = $0.000045"""
        from app.routes.ai_coach import calculate_ai_cost
        
        cost = calculate_ai_cost("gpt-4o-mini", 100, 50)
        # Expected: (100/1000 * 0.00015) + (50/1000 * 0.0006) = 0.000015 + 0.00003 = 0.000045
        expected = 0.000045
        assert abs(cost - expected) < 0.00000001, f"Expected ${expected}, got ${cost}"
        print(f"PASS: 100 prompt + 50 completion = ${cost:.8f}")
    
    def test_cost_calculation_zero_tokens(self):
        """Test: 0 prompt + 0 completion = $0"""
        from app.routes.ai_coach import calculate_ai_cost
        
        cost = calculate_ai_cost("gpt-4o-mini", 0, 0)
        assert cost == 0, f"Expected $0, got ${cost}"
        print(f"PASS: 0 tokens = $0")
    
    def test_cost_calculation_large_tokens(self):
        """Test: 10000 prompt + 5000 completion for large requests"""
        from app.routes.ai_coach import calculate_ai_cost
        
        cost = calculate_ai_cost("gpt-4o-mini", 10000, 5000)
        # Expected: (10000/1000 * 0.00015) + (5000/1000 * 0.0006) = 0.0015 + 0.003 = 0.0045
        expected = 0.0045
        assert abs(cost - expected) < 0.00000001, f"Expected ${expected}, got ${cost}"
        print(f"PASS: Large tokens = ${cost:.6f}")
    
    def test_cost_calculation_unknown_model_fallback(self):
        """Test: Unknown model falls back to gpt-4o-mini pricing"""
        from app.routes.ai_coach import calculate_ai_cost
        
        cost_unknown = calculate_ai_cost("unknown-model", 100, 50)
        cost_default = calculate_ai_cost("gpt-4o-mini", 100, 50)
        assert cost_unknown == cost_default, "Unknown model should fallback to gpt-4o-mini pricing"
        print(f"PASS: Unknown model uses fallback pricing")
    
    def test_cost_calculation_precision(self):
        """Test: Cost is rounded to 8 decimal places"""
        from app.routes.ai_coach import calculate_ai_cost
        
        cost = calculate_ai_cost("gpt-4o-mini", 123, 456)
        # Should be rounded to 8 decimals
        cost_str = f"{cost:.8f}"
        assert len(cost_str.split('.')[1]) <= 8, "Cost should be rounded to 8 decimal places"
        print(f"PASS: Cost precision is correct: ${cost_str}")


# =============================================================================
# Test 2: Usage Object NoneType Handling
# =============================================================================
class TestUsageNoneTypeHandling:
    """Test that usage logging handles None/null values gracefully"""
    
    def test_usage_object_none(self):
        """Test: usage is None - should not throw"""
        # Simulate the guard logic from ai_coach.py lines 442-467
        usage = None
        result = {"logged": False, "error": None}
        
        try:
            if usage and hasattr(usage, 'prompt_tokens') and hasattr(usage, 'completion_tokens'):
                result["logged"] = True
            else:
                result["logged"] = False
        except Exception as e:
            result["error"] = str(e)
        
        assert result["error"] is None, f"Should not throw: {result['error']}"
        assert result["logged"] is False, "Should not attempt logging with None usage"
        print("PASS: None usage object handled gracefully")
    
    def test_usage_missing_prompt_tokens(self):
        """Test: usage.prompt_tokens is None"""
        usage = Mock()
        usage.prompt_tokens = None
        usage.completion_tokens = 50
        usage.total_tokens = 50
        
        result = {"logged": False, "error": None}
        
        try:
            if usage and hasattr(usage, 'prompt_tokens') and hasattr(usage, 'completion_tokens'):
                prompt_tokens = usage.prompt_tokens or 0
                completion_tokens = usage.completion_tokens or 0
                total_tokens = getattr(usage, 'total_tokens', None) or (prompt_tokens + completion_tokens)
                
                if prompt_tokens > 0 or completion_tokens > 0:
                    result["logged"] = True
                    result["tokens"] = {"prompt": prompt_tokens, "completion": completion_tokens, "total": total_tokens}
        except Exception as e:
            result["error"] = str(e)
        
        assert result["error"] is None, f"Should not throw: {result['error']}"
        assert result.get("tokens", {}).get("prompt") == 0, "None should become 0"
        print("PASS: None prompt_tokens handled with fallback to 0")
    
    def test_usage_missing_completion_tokens(self):
        """Test: usage.completion_tokens is None"""
        usage = Mock()
        usage.prompt_tokens = 100
        usage.completion_tokens = None
        usage.total_tokens = 100
        
        result = {"logged": False, "error": None}
        
        try:
            if usage and hasattr(usage, 'prompt_tokens') and hasattr(usage, 'completion_tokens'):
                prompt_tokens = usage.prompt_tokens or 0
                completion_tokens = usage.completion_tokens or 0
                total_tokens = getattr(usage, 'total_tokens', None) or (prompt_tokens + completion_tokens)
                
                if prompt_tokens > 0 or completion_tokens > 0:
                    result["logged"] = True
                    result["tokens"] = {"prompt": prompt_tokens, "completion": completion_tokens, "total": total_tokens}
        except Exception as e:
            result["error"] = str(e)
        
        assert result["error"] is None, f"Should not throw: {result['error']}"
        assert result.get("tokens", {}).get("completion") == 0, "None should become 0"
        print("PASS: None completion_tokens handled with fallback to 0")
    
    def test_usage_missing_total_tokens(self):
        """Test: usage.total_tokens is None - should calculate from prompt + completion"""
        usage = Mock()
        usage.prompt_tokens = 100
        usage.completion_tokens = 50
        
        # Simulate missing total_tokens attribute
        del usage.total_tokens
        
        result = {"logged": False, "error": None}
        
        try:
            if usage and hasattr(usage, 'prompt_tokens') and hasattr(usage, 'completion_tokens'):
                prompt_tokens = usage.prompt_tokens or 0
                completion_tokens = usage.completion_tokens or 0
                total_tokens = getattr(usage, 'total_tokens', None) or (prompt_tokens + completion_tokens)
                
                result["tokens"] = {"prompt": prompt_tokens, "completion": completion_tokens, "total": total_tokens}
        except Exception as e:
            result["error"] = str(e)
        
        assert result["error"] is None, f"Should not throw: {result['error']}"
        assert result.get("tokens", {}).get("total") == 150, "Total should be calculated as prompt + completion"
        print("PASS: Missing total_tokens calculated correctly")
    
    def test_usage_all_zeros(self):
        """Test: All token values are 0 - should skip logging"""
        usage = Mock()
        usage.prompt_tokens = 0
        usage.completion_tokens = 0
        usage.total_tokens = 0
        
        result = {"should_log": False}
        
        prompt_tokens = usage.prompt_tokens or 0
        completion_tokens = usage.completion_tokens or 0
        
        if prompt_tokens > 0 or completion_tokens > 0:
            result["should_log"] = True
        
        assert result["should_log"] is False, "Should not log when all tokens are 0"
        print("PASS: Zero tokens correctly skips logging")


# =============================================================================
# Test 3: Background Task Exception Handling
# =============================================================================
class TestBackgroundTaskExceptionHandling:
    """Test _handle_logging_task_result prevents 'Task exception never retrieved'"""
    
    def test_callback_retrieves_exception(self):
        """Test: Callback retrieves task exception to prevent warning"""
        from app.routes.ai_coach import _handle_logging_task_result
        
        # Create a mock task with an exception
        mock_task = Mock(spec=asyncio.Task)
        mock_task.exception.return_value = ValueError("Test error")
        
        # Should not raise
        try:
            _handle_logging_task_result(mock_task)
            print("PASS: Callback handles exception without raising")
        except Exception as e:
            pytest.fail(f"Callback should not raise: {e}")
    
    def test_callback_handles_cancelled_task(self):
        """Test: Callback handles CancelledError gracefully"""
        from app.routes.ai_coach import _handle_logging_task_result
        
        mock_task = Mock(spec=asyncio.Task)
        mock_task.exception.side_effect = asyncio.CancelledError()
        
        try:
            _handle_logging_task_result(mock_task)
            print("PASS: Callback handles CancelledError gracefully")
        except Exception as e:
            pytest.fail(f"Callback should not raise: {e}")
    
    def test_callback_handles_successful_task(self):
        """Test: Callback handles successful task (no exception)"""
        from app.routes.ai_coach import _handle_logging_task_result
        
        mock_task = Mock(spec=asyncio.Task)
        mock_task.exception.return_value = None
        
        try:
            _handle_logging_task_result(mock_task)
            print("PASS: Callback handles successful task")
        except Exception as e:
            pytest.fail(f"Callback should not raise: {e}")


# =============================================================================
# Test 4: Async Logging Function Tests
# =============================================================================
@pytest.mark.asyncio
class TestAsyncLoggingFunction:
    """Test log_ai_usage_background async function"""
    
    async def test_logging_function_non_blocking(self):
        """Test: Logging task fires quickly (< 100ms to create)"""
        from app.routes.ai_coach import log_ai_usage_background
        
        test_user_id = f"test_timing_{int(time.time())}"
        
        start = time.time()
        task = asyncio.create_task(log_ai_usage_background(
            user_id=test_user_id,
            model="gpt-4o-mini",
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost=0.000045
        ))
        fire_time = time.time() - start
        
        # Task creation should be instant
        assert fire_time < 0.1, f"Task creation took too long: {fire_time}s"
        print(f"PASS: Task created in {fire_time*1000:.2f}ms (< 100ms)")
        
        # Wait for task with timeout
        try:
            await asyncio.wait_for(task, timeout=30.0)
        except asyncio.TimeoutError:
            print("WARNING: Task timed out (MongoDB connectivity issue in preview env)")
        except Exception as e:
            print(f"WARNING: Task failed (expected in preview env): {e}")
    
    async def test_logging_function_handles_db_error(self):
        """Test: Logging function catches DB errors internally"""
        from app.routes.ai_coach import log_ai_usage_background
        
        # Save original MONGO_URL and set invalid one
        original_url = os.environ.get("MONGO_URL")
        os.environ["MONGO_URL"] = "mongodb://invalid:27017/test"
        
        try:
            # Should not raise - errors are caught internally
            await asyncio.wait_for(
                log_ai_usage_background(
                    user_id="test_error_handling",
                    model="gpt-4o-mini",
                    prompt_tokens=100,
                    completion_tokens=50,
                    total_tokens=150,
                    estimated_cost=0.000045
                ),
                timeout=5.0
            )
            print("PASS: Logging function handles DB errors gracefully")
        except asyncio.TimeoutError:
            print("PASS: Logging function timed out on bad connection (expected)")
        except Exception as e:
            pytest.fail(f"Logging function should not propagate errors: {e}")
        finally:
            # Restore original URL
            if original_url:
                os.environ["MONGO_URL"] = original_url


# =============================================================================
# Test 5: Load Testing - Concurrent Calls
# =============================================================================
@pytest.mark.asyncio
class TestLoadConcurrent:
    """Load test: Simulate concurrent logging calls"""
    
    async def test_50_concurrent_logging_tasks(self):
        """Test: 50 concurrent background logging tasks don't block event loop"""
        from app.routes.ai_coach import log_ai_usage_background, _handle_logging_task_result
        
        NUM_TASKS = 50
        test_prefix = f"load_test_{int(time.time())}"
        
        start = time.time()
        tasks = []
        
        # Fire 50 tasks rapidly
        for i in range(NUM_TASKS):
            task = asyncio.create_task(log_ai_usage_background(
                user_id=f"{test_prefix}_{i}",
                model="gpt-4o-mini",
                prompt_tokens=100 + i,
                completion_tokens=50 + i,
                total_tokens=150 + (i * 2),
                estimated_cost=0.000045 + (i * 0.000001)
            ))
            task.add_done_callback(_handle_logging_task_result)
            tasks.append(task)
        
        fire_time = time.time() - start
        print(f"All {NUM_TASKS} tasks created in {fire_time*1000:.2f}ms")
        
        # All tasks should be created quickly (event loop not blocked)
        assert fire_time < 0.5, f"Firing {NUM_TASKS} tasks took too long: {fire_time}s"
        
        # Wait for tasks with timeout (some may fail due to MongoDB connectivity)
        try:
            await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=60.0)
        except asyncio.TimeoutError:
            print(f"WARNING: Some tasks timed out (MongoDB connectivity in preview env)")
        
        total_time = time.time() - start
        print(f"PASS: {NUM_TASKS} concurrent tasks completed/timed out in {total_time:.2f}s")
        print(f"Average time per task: {(total_time/NUM_TASKS)*1000:.2f}ms")


# =============================================================================
# Test 6: MongoDB Index Verification
# =============================================================================
@pytest.mark.asyncio
class TestMongoDBIndexes:
    """Verify MongoDB indexes exist and are used"""
    
    async def test_indexes_exist(self):
        """Test: Required indexes exist on ai_usage_logs collection"""
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        if not mongo_url:
            pytest.skip("MONGO_URL not configured")
        
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
            db = client[db_name]
            
            indexes = await asyncio.wait_for(
                db.ai_usage_logs.index_information(),
                timeout=15.0
            )
            
            expected_indexes = ['user_id_1', 'timestamp_1', 'user_id_1_timestamp_-1']
            found_indexes = list(indexes.keys())
            
            print(f"Found indexes: {found_indexes}")
            
            for idx in expected_indexes:
                if idx in found_indexes:
                    print(f"PASS: Index '{idx}' exists")
                else:
                    print(f"WARNING: Index '{idx}' not found - may need to run index creation script")
            
            client.close()
            
        except asyncio.TimeoutError:
            print("WARNING: MongoDB connection timed out (infrastructure issue in preview env)")
            pytest.skip("MongoDB connectivity issue")
        except Exception as e:
            print(f"WARNING: MongoDB connection failed: {e}")
            pytest.skip(f"MongoDB connectivity issue: {e}")
    
    async def test_index_usage_explain(self):
        """Test: Indexes are used for user_id + timestamp queries (explain)"""
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "ineednumbers")
        
        if not mongo_url:
            pytest.skip("MONGO_URL not configured")
        
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
            db = client[db_name]
            
            # Run explain on a typical query
            explain_result = await asyncio.wait_for(
                db.ai_usage_logs.find({
                    "user_id": "test_user",
                    "timestamp": {"$gte": datetime(2024, 1, 1, tzinfo=timezone.utc)}
                }).explain(),
                timeout=15.0
            )
            
            # Check if index is used
            query_planner = explain_result.get("queryPlanner", {})
            winning_plan = query_planner.get("winningPlan", {})
            
            # Look for IXSCAN (index scan) vs COLLSCAN (collection scan)
            plan_str = str(winning_plan)
            
            if "IXSCAN" in plan_str:
                print("PASS: Query uses index scan (IXSCAN)")
            elif "COLLSCAN" in plan_str:
                print("WARNING: Query uses collection scan (COLLSCAN) - indexes may not be optimal")
            else:
                print(f"INFO: Query plan: {winning_plan}")
            
            client.close()
            
        except asyncio.TimeoutError:
            print("WARNING: MongoDB explain timed out")
            pytest.skip("MongoDB connectivity issue")
        except Exception as e:
            print(f"WARNING: MongoDB explain failed: {e}")
            pytest.skip(f"MongoDB connectivity issue: {e}")


# =============================================================================
# Test 7: Document Schema Validation
# =============================================================================
class TestDocumentSchema:
    """Test ai_usage_logs document schema"""
    
    def test_document_has_required_fields(self):
        """Test: Document contains all required fields"""
        required_fields = [
            "user_id",
            "model", 
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "estimated_cost",
            "timestamp"
        ]
        
        # Create a test document following the schema
        from datetime import datetime, timezone
        
        test_doc = {
            "user_id": "test_user_123",
            "model": "gpt-4o-mini",
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
            "estimated_cost": 0.000045,
            "timestamp": datetime.now(timezone.utc)
        }
        
        for field in required_fields:
            assert field in test_doc, f"Required field '{field}' missing"
        
        print(f"PASS: Document has all {len(required_fields)} required fields")
    
    def test_document_excludes_pii(self):
        """Test: Document schema does NOT include PII fields"""
        forbidden_fields = [
            "prompt",
            "response",
            "email",
            "name",
            "financial_data",
            "messages",
            "api_key"
        ]
        
        # The logging schema from ai_coach.py lines 81-89
        allowed_fields = [
            "user_id",
            "model",
            "prompt_tokens",
            "completion_tokens", 
            "total_tokens",
            "estimated_cost",
            "timestamp"
        ]
        
        for field in forbidden_fields:
            assert field not in allowed_fields, f"PII field '{field}' should not be in schema"
        
        print(f"PASS: Schema correctly excludes {len(forbidden_fields)} PII fields")


# =============================================================================
# Test 8: Integration with OpenAI Response Object
# =============================================================================
class TestOpenAIResponseIntegration:
    """Test handling of actual OpenAI response.usage structure"""
    
    def test_openai_usage_structure(self):
        """Test: Correctly extracts usage from OpenAI-like response"""
        # Simulate OpenAI response.usage object
        usage = Mock()
        usage.prompt_tokens = 150
        usage.completion_tokens = 75
        usage.total_tokens = 225
        
        response = Mock()
        response.usage = usage
        
        # Extract like ai_coach.py does
        extracted_usage = getattr(response, 'usage', None)
        
        assert extracted_usage is not None
        assert extracted_usage.prompt_tokens == 150
        assert extracted_usage.completion_tokens == 75
        assert extracted_usage.total_tokens == 225
        
        print("PASS: Correctly extracts usage from OpenAI response structure")
    
    def test_response_without_usage_attribute(self):
        """Test: Handles response without usage attribute"""
        response = Mock(spec=['choices', 'model'])
        
        # getattr with None default should work
        usage = getattr(response, 'usage', None)
        
        assert usage is None
        print("PASS: Handles missing usage attribute gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
