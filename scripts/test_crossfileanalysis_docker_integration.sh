#!/bin/bash
set -e

# Configuration
API_URL="http://localhost:8080"
PREMIUM_KEY="test-premium-key"
PREMIUM_HASH="f723222acb11f601593d4b232f743ce7c254b39fe7bbfad333aad3d57e397316"

echo "🧪 Starting Docker Integration Tests - Full Cross-File Coverage"

# 1. Setup Database
echo "📋 Setting up Database..."
docker exec core-db psql -U securetag -d securetag -c "
UPDATE securetag.tenant SET plan = 'Premium' WHERE id = 'tenant_premium';
DELETE FROM securetag.api_key WHERE key_hash = '$PREMIUM_HASH';
INSERT INTO securetag.api_key (tenant_id, key_hash, name, is_active) VALUES 
('tenant_premium', '$PREMIUM_HASH', 'Test Premium Key', true);
" > /dev/null

# Function to run test
run_test() {
    LANG=$1
    DIR=$2
    ZIP_NAME=$3
    ALIAS=$4

    echo "---------------------------------------------------"
    echo "🧪 Testing $LANG (Fixture: $DIR)"
    
    if [ ! -d "$DIR" ]; then
        echo "❌ Error: $DIR not found!"
        exit 1
    fi

    # Zip
    echo "📦 Zipping payload..."
    cd "$DIR"
    zip -r "../../../$ZIP_NAME" . > /dev/null
    cd ../../..

    # Upload
    echo "🚀 Uploading to API..."
    RESPONSE=$(curl -s -X POST "$API_URL/codeaudit/upload" \
      -H "X-API-Key: $PREMIUM_KEY" \
      -F "file=@$ZIP_NAME" \
      -F "project_alias=$ALIAS")

    TASK_ID=$(echo $RESPONSE | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$TASK_ID" ]; then
        echo "❌ Failed to submit task. Response: $RESPONSE"
        exit 1
    fi
    echo "✅ Task Submitted: $TASK_ID"
    
    # Wait for processing
    echo "⏳ Waiting 90s for processing (Deep Vision is slow)..."
    sleep 90
    
    # Check Logs
    echo "👀 Checking Logs for Vulnerabilities..."
    LOGS=$(docker logs core-worker --since 2m)
    
    # Debug: Print extraction count
    echo "$LOGS" | grep "Extracted" || echo "⚠️ No extraction logs found"

    # Simple count of detected vulnerabilities
    COUNT=$(echo "$LOGS" | grep -c "Cross-File .* detected" || true)
    echo "📊 Detected $COUNT Cross-File Vulnerabilities in logs"
    
    # Print specific findings
    echo "$LOGS" | grep "Cross-File" | cut -d']' -f2- | sort | uniq
}

# 2. Run Tests
run_test "TypeScript (Node.js)" "test/fixtures/mvc_complete" "vulnerable-ts-complete.zip" "ts-complete-test"
run_test "Python" "test/fixtures/python_mvc" "vulnerable-python.zip" "python-test"
run_test "Java" "test/fixtures/java_mvc" "vulnerable-java.zip" "java-test"

echo "---------------------------------------------------"
echo "🎉 All tests completed."
