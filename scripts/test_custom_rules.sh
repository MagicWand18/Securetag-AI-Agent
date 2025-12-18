#!/usr/bin/env bash
set -u

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Cargar variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    error ".env not found"
    exit 1
fi

API_URL="http://localhost:8080"

# Create test project zip
info "Creating test project zip..."
mkdir -p temp_test_project
cat > temp_test_project/package.json <<EOF
{
  "name": "test-project",
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^5.10.0"
  }
}
EOF

cat > temp_test_project/app.js <<EOF
const express = require('express');
const app = express();
app.get('/', (req, res) => {
    const user = req.query.user;
    // Vulnerable code for test
    eval(user);
    res.send('Hello');
});
EOF

zip -r test_project.zip temp_test_project > /dev/null

# ---------------------------------------------------------
# TEST 1: Try PRO model (Should fail for Standard Tenant)
# ---------------------------------------------------------
info "TEST 1: Uploading task with custom_rule_model=pro (Expected: FAIL 403)..."
RESPONSE=$(curl -s -X POST "${API_URL}/codeaudit/upload" \
  -H "X-API-Key: ${WORKER_API_KEY:-master_key}" \
  -F "file=@test_project.zip" \
  -F "project_alias=custom-rules-test" \
  -F "custom_rules=true" \
  -F "custom_rules_qty=1" \
  -F "custom_rule_model=pro")

if echo "$RESPONSE" | grep -q '"ok":false'; then
    ERR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    info "SUCCESS: Request failed as expected with error: $ERR"
else
    error "FAILURE: Request succeeded but should have failed! Response: $RESPONSE"
    # Don't exit yet, try next tests
fi

# ---------------------------------------------------------
# TEST 2: Try MAX model (Should fail for Standard Tenant)
# ---------------------------------------------------------
info "TEST 2: Uploading task with custom_rule_model=max (Expected: FAIL 403)..."
RESPONSE=$(curl -s -X POST "${API_URL}/codeaudit/upload" \
  -H "X-API-Key: ${WORKER_API_KEY:-master_key}" \
  -F "file=@test_project.zip" \
  -F "project_alias=custom-rules-test" \
  -F "custom_rules=true" \
  -F "custom_rules_qty=1" \
  -F "custom_rule_model=max")

if echo "$RESPONSE" | grep -q '"ok":false'; then
    ERR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    info "SUCCESS: Request failed as expected with error: $ERR"
else
    error "FAILURE: Request succeeded but should have failed! Response: $RESPONSE"
fi

# ---------------------------------------------------------
# TEST 3: Try STANDARD model (Should succeed)
# ---------------------------------------------------------
info "TEST 3: Uploading task with custom_rule_model=standard (Expected: SUCCESS)..."
RESPONSE=$(curl -s -X POST "${API_URL}/codeaudit/upload" \
  -H "X-API-Key: ${WORKER_API_KEY:-master_key}" \
  -F "file=@test_project.zip" \
  -F "project_alias=custom-rules-test" \
  -F "custom_rules=true" \
  -F "custom_rules_qty=2" \
  -F "custom_rule_model=standard")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    TASK_ID=$(echo "$RESPONSE" | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
    info "Task created: $TASK_ID"
    
    # Poll for completion
    info "Waiting for task completion..."
    for i in {1..60}; do
        STATUS_RES=$(curl -s "${API_URL}/codeaudit/${TASK_ID}" -H "X-API-Key: ${WORKER_API_KEY:-master_key}")
        STATUS=$(echo "$STATUS_RES" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        echo -ne "Status: $STATUS\r"
        
        if [ "$STATUS" = "completed" ]; then
            echo ""
            info "Task completed!"
            
            # Parse and display detailed info using python
            echo "$STATUS_RES" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    data = json.loads(raw)
    result = data.get('result') or {}
    summary = result.get('summary') or {}
    cr = summary.get('custom_rules') or {}
    
    print('\n' + '='*50)
    print(' CUSTOM RULES EXECUTION REPORT')
    print('='*50)
    print(f' Model Used:      {cr.get(\"model\", \"N/A\")}')
    print(f' Attempts:        {cr.get(\"attempts\", 0)}')
    print(f' Successes:       {cr.get(\"successes\", 0)}')
    print(f' Failures:        {cr.get(\"failures\", 0)}')
    print(f' Total Cost:      {cr.get(\"total_cost\", 0)} credits')
    print('-'*50)
    
    findings = result.get('findings') or []
    print(f' Findings Found: {len(findings)}')
    for f in findings:
        rname = f.get(\"rule_name\", \"\")
        if \"synthetic\" in rname:
             print(f'  [GENERATED RULE MATCH] {rname} ({f.get(\"severity\")})')
             print(f'   File: {f.get(\"file_path\")}:{f.get(\"line\")}')
        else:
             print(f'  [STANDARD RULE MATCH] {rname} ({f.get(\"severity\")})')
    print('='*50 + '\n')

except Exception as e:
    print('Error parsing JSON report:', e)
    print('RAW RESPONSE:')
    print(raw)
"
            break
        fi
        
        if [ "$STATUS" = "failed" ]; then
            echo ""
            error "Task failed!"
            echo "$STATUS_RES"
            exit 1
        fi
        
        sleep 5
    done
else
    error "Failed to upload task: $RESPONSE"
    exit 1
fi

# Cleanup
rm -rf temp_test_project test_project.zip
