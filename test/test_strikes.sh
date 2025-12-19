#!/bin/bash

echo "🧪 Testing Strike-Based Ban System..."

# 1. Reset State
echo "🧹 Cleaning up DB..."
docker exec -i securetag-db psql -U securetag -d securetag -c "TRUNCATE TABLE securetag.security_strike; DELETE FROM securetag.security_ban WHERE type='ip';"

# 2. Strike 1
echo "👊 Strike 1: Invalid API Key"
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: invalid_key_1" http://localhost:8080/scans/web
# Expected: 401

# 3. Strike 2
echo "👊 Strike 2: Invalid API Key"
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: invalid_key_2" http://localhost:8080/scans/web
# Expected: 401

# 4. Strike 3 (Trigger Ban)
echo "👊 Strike 3: Invalid API Key (Should trigger ban)"
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: invalid_key_3" http://localhost:8080/scans/web
# Expected: 401 (but ban created in background)

sleep 1 # Wait for async ban to propagate/sync

# 5. Verify Ban
echo "🔒 Verifying Ban..."
# Try with a VALID key (simulated, or just check 403 response even with no key if IP banned)
# Even without a valid key, if IP is banned, we should get 403 instead of 401.
CODE=$(curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/healthz)
# healthz is usually not banned, let's try a protected endpoint
CODE=$(curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: some_random_key" http://localhost:8080/scans/web)

if [ "$CODE" == "403" ]; then
    echo "✅ Success: IP is banned (403)"
else
    echo "❌ Failure: Expected 403, got $CODE"
fi

# Check DB
echo "📊 Checking DB Records:"
docker exec -i securetag-db psql -U securetag -d securetag -c "SELECT * FROM securetag.security_strike;"
docker exec -i securetag-db psql -U securetag -d securetag -c "SELECT * FROM securetag.security_ban WHERE type='ip';"
