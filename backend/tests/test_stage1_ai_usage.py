"""
Stage 1 Integration Test: AI Usage Logging
Tests that:
1. AI usage is logged to ai_usage_logs collection
2. Logging is non-blocking (doesn't delay response)
3. Correct fields are captured (no PII)
"""
import asyncio
import os
import sys
import time

# Add path for imports
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient


async def test_ai_usage_logging():
    """
    Test the AI usage logging functionality.
    Since we can't call the actual AI endpoint without auth,
    we directly test the logging function.
    """
    from app.routes.ai_coach import log_ai_usage_background, calculate_ai_cost
    
    print("=" * 60)
    print("STAGE 1: AI Usage Logging Integration Test")
    print("=" * 60)
    
    # Test 1: Cost calculation
    print("\n[TEST 1] Cost Calculation")
    cost = calculate_ai_cost("gpt-4o-mini", 100, 50)
    expected_cost = (100/1000 * 0.00015) + (50/1000 * 0.0006)
    print(f"  Input: 100 prompt tokens, 50 completion tokens")
    print(f"  Calculated cost: ${cost:.8f}")
    print(f"  Expected cost: ${expected_cost:.8f}")
    assert abs(cost - expected_cost) < 0.00000001, "Cost calculation mismatch"
    print("  ✓ PASS: Cost calculation correct")
    
    # Test 2: Non-blocking logging (measure timing)
    print("\n[TEST 2] Non-blocking Logging")
    test_user_id = "test_user_stage1_validation"
    
    start_time = time.time()
    # Fire the background task
    task = asyncio.create_task(log_ai_usage_background(
        user_id=test_user_id,
        model="gpt-4o-mini",
        prompt_tokens=150,
        completion_tokens=75,
        total_tokens=225,
        estimated_cost=0.0000675
    ))
    fire_time = time.time() - start_time
    print(f"  Background task created in: {fire_time*1000:.2f}ms")
    
    # Verify the task was created immediately (non-blocking)
    assert fire_time < 0.1, f"Task creation took too long: {fire_time}s (should be <0.1s)"
    print("  ✓ PASS: Task fired non-blocking (< 100ms)")
    
    # Wait for the task to complete
    await task
    
    # Test 3: Verify data was written to MongoDB
    print("\n[TEST 3] MongoDB Data Verification")
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "ineednumbers")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Find the test document
    doc = await db.ai_usage_logs.find_one({"user_id": test_user_id})
    
    if doc:
        print(f"  Document found in ai_usage_logs:")
        print(f"    - user_id: {doc['user_id']}")
        print(f"    - model: {doc['model']}")
        print(f"    - prompt_tokens: {doc['prompt_tokens']}")
        print(f"    - completion_tokens: {doc['completion_tokens']}")
        print(f"    - total_tokens: {doc['total_tokens']}")
        print(f"    - estimated_cost: {doc['estimated_cost']}")
        print(f"    - timestamp: {doc['timestamp']}")
        
        # Validate no PII fields
        forbidden_fields = ['prompt', 'response', 'email', 'name', 'financial_data', 'messages']
        for field in forbidden_fields:
            assert field not in doc, f"Forbidden field '{field}' found in log"
        print("  ✓ PASS: No PII fields in document")
        
        # Validate required fields
        required_fields = ['user_id', 'model', 'prompt_tokens', 'completion_tokens', 
                          'total_tokens', 'estimated_cost', 'timestamp']
        for field in required_fields:
            assert field in doc, f"Required field '{field}' missing"
        print("  ✓ PASS: All required fields present")
        
        # Cleanup test document
        await db.ai_usage_logs.delete_one({"user_id": test_user_id})
        print("  ✓ Test document cleaned up")
    else:
        print("  ✗ FAIL: Document not found in MongoDB")
        client.close()
        return False
    
    # Test 4: Verify indexes exist
    print("\n[TEST 4] Index Verification")
    indexes = await db.ai_usage_logs.index_information()
    expected_indexes = ['user_id_1', 'timestamp_1', 'user_id_1_timestamp_-1']
    
    for idx in expected_indexes:
        assert idx in indexes, f"Index '{idx}' not found"
        print(f"  ✓ Index exists: {idx}")
    
    print("  ✓ PASS: All required indexes present")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("ALL STAGE 1 TESTS PASSED")
    print("=" * 60)
    return True


if __name__ == "__main__":
    result = asyncio.run(test_ai_usage_logging())
    sys.exit(0 if result else 1)
