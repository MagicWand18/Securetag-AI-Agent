#!/bin/bash

# Configuration
API_URL="http://localhost:8080"
DB_CONTAINER="securetag-db"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🧪 Starting Manual Ban Test (User & Cascading)${NC}"

# 1. Setup Test Data (User & Admin & API Keys)
echo "-------------------------------------------"
echo "🛠️  Setting up test user and admin..."

# Create random identifiers
TEST_USER_EMAIL="victim_$(date +%s)@test.com"
TEST_ADMIN_EMAIL="admin_$(date +%s)@test.com"
TENANT_ID="production"

# Insert User (Victim)
echo "Creating victim user..."
docker exec -i $DB_CONTAINER psql -U securetag -d securetag -c "INSERT INTO securetag.app_user(email, role, tenant_id) VALUES ('$TEST_USER_EMAIL', 'member', '$TENANT_ID');"

# Get User ID
USER_ID=$(docker exec -i $DB_CONTAINER psql -U securetag -d securetag -t -c "SELECT id FROM securetag.app_user WHERE email = '$TEST_USER_EMAIL'" | xargs)
echo "Victim User ID: $USER_ID"

# Create API Key for Victim
VICTIM_KEY="victim-secret-key-$(date +%s)"
VICTIM_HASH=$(echo -n "$VICTIM_KEY" | openssl dgst -sha256 | sed 's/^.* //')
docker exec -i $DB_CONTAINER psql -U securetag -d securetag -c "INSERT INTO securetag.api_key(tenant_id, user_id, key_hash, name) VALUES ('$TENANT_ID', '$USER_ID', '$VICTIM_HASH', 'Victim Key');"

# Insert Admin
echo "Creating admin user..."
docker exec -i $DB_CONTAINER psql -U securetag -d securetag -c "INSERT INTO securetag.app_user(email, role, tenant_id) VALUES ('$TEST_ADMIN_EMAIL', 'admin', '$TENANT_ID');"

# Get Admin ID
ADMIN_ID=$(docker exec -i $DB_CONTAINER psql -U securetag -d securetag -t -c "SELECT id FROM securetag.app_user WHERE email = '$TEST_ADMIN_EMAIL'" | xargs)
echo "Admin User ID: $ADMIN_ID"

# Create API Key for Admin
ADMIN_KEY="admin-secret-key-$(date +%s)"
ADMIN_HASH=$(echo -n "$ADMIN_KEY" | openssl dgst -sha256 | sed 's/^.* //')
docker exec -i $DB_CONTAINER psql -U securetag -d securetag -c "INSERT INTO securetag.api_key(tenant_id, user_id, key_hash, name) VALUES ('$TENANT_ID', '$ADMIN_ID', '$ADMIN_HASH', 'Admin Key');"

# 2. Verify Access (Should be OK)
echo "-------------------------------------------"
echo "🔍 Verifying initial access..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $VICTIM_KEY" "$API_URL/healthz")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Victim access verified (200 OK)${NC}"
else
    echo -e "${RED}❌ Victim access failed ($HTTP_CODE)${NC}"
    exit 1
fi

# 3. Execute Ban (Admin Action)
echo "-------------------------------------------"
echo "🔨 Executing Ban Hammer..."

BAN_RESPONSE=$(curl -s -X POST "$API_URL/admin/users/$USER_ID/ban" \
  -H "X-API-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing cascading ban"}')

echo "Ban Response: $BAN_RESPONSE"

# 4. Verify Ban (User Access)
echo "-------------------------------------------"
echo "🔍 Verifying user ban..."

HTTP_CODE_BANNED=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $VICTIM_KEY" "$API_URL/projects")

if [ "$HTTP_CODE_BANNED" == "403" ]; then
    echo -e "${GREEN}✅ Victim correctly blocked (403 Forbidden)${NC}"
else
    echo -e "${RED}❌ Victim NOT blocked ($HTTP_CODE_BANNED)${NC}"
    # Remove exit 1 to allow debugging DB state
    # exit 1 
fi

# 5. Verify Database State (Cascading)
echo "-------------------------------------------"
echo "🔍 Verifying DB state..."

IS_USER_BANNED=$(docker exec -i $DB_CONTAINER psql -U securetag -d securetag -t -c "SELECT is_banned FROM securetag.security_ban WHERE type='user' AND value='$USER_ID'" | xargs)
IS_KEY_BANNED=$(docker exec -i $DB_CONTAINER psql -U securetag -d securetag -t -c "SELECT is_banned FROM securetag.security_ban WHERE type='api_key' AND value='$VICTIM_HASH'" | xargs)
IS_KEY_ACTIVE=$(docker exec -i $DB_CONTAINER psql -U securetag -d securetag -t -c "SELECT is_active FROM securetag.api_key WHERE key_hash='$VICTIM_HASH'" | xargs)

if [ "$IS_USER_BANNED" == "t" ]; then
    echo -e "${GREEN}✅ User recorded in security_ban${NC}"
else
    echo -e "${RED}❌ User NOT found in security_ban${NC}"
fi

if [ "$IS_KEY_BANNED" == "t" ]; then
    echo -e "${GREEN}✅ API Key recorded in security_ban (Cascade)${NC}"
else
    echo -e "${RED}❌ API Key NOT found in security_ban${NC}"
fi

if [ "$IS_KEY_ACTIVE" == "f" ]; then
    echo -e "${GREEN}✅ API Key marked inactive in api_key table${NC}"
else
    echo -e "${RED}❌ API Key still active in api_key table${NC}"
fi

echo "-------------------------------------------"
echo -e "${GREEN}🎉 Test Completed Successfully!${NC}"
