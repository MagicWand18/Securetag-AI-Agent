#!/bin/bash
EMAIL="delete_test_new@securetag.io"
PASS="password123"

# Signup (ignoring result)
curl -s -X POST http://localhost:3001/auth/email/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASS\"}" > /dev/null

# Login
echo "Logging in..."
LOGIN_RESP=$(curl -s -X POST http://localhost:3001/auth/email/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASS\"}")

SESSION_ID=$(echo $LOGIN_RESP | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')

if [ -z "$SESSION_ID" ]; then
  echo "Login failed: $LOGIN_RESP"
  exit 1
fi

echo "Logged in. Session ID: $SESSION_ID"

# Call deleteAccount
echo "Deleting account..."
curl -v -X POST http://localhost:3001/operations/delete-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_ID" \
  -d '{}'
