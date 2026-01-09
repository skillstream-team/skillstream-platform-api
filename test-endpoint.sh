#!/bin/bash

# Test script for course creation endpoint
# Tests that the endpoint accepts requests without order and createdBy

# Configuration
API_URL="${API_URL:-https://skillstream-platform-api.onrender.com}"
AUTH_TOKEN="${AUTH_TOKEN}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Error: AUTH_TOKEN environment variable is required"
  echo ""
  echo "To get a token:"
  echo "  1. Login as a teacher user through the frontend"
  echo "  2. Copy the JWT token from the browser's localStorage or network request"
  echo "  3. Set it as: export AUTH_TOKEN=\"your-token-here\""
  exit 1
fi

echo "Testing course creation endpoint: ${API_URL}/api/courses"
echo ""

# Test payload without order and createdBy (matching frontend request)
PAYLOAD='{
  "title": "Test Course - Validation Fix",
  "description": "This is a test course to verify the validation fix",
  "price": 0,
  "instructorId": "test-instructor-id",
  "difficulty": "BEGINNER",
  "duration": 10,
  "language": "en"
}'

echo "Request payload (without order and createdBy):"
echo "$PAYLOAD" | jq .
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/courses" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Extract status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ SUCCESS: Course created successfully!"
  
  # Verify that order and createdBy were auto-populated
  ORDER=$(echo "$BODY" | jq -r '.order // empty' 2>/dev/null)
  CREATED_BY=$(echo "$BODY" | jq -r '.createdBy // empty' 2>/dev/null)
  
  if [ -n "$ORDER" ]; then
    echo "✅ Verified: order was auto-generated: $ORDER"
  else
    echo "⚠️  Warning: order was not auto-generated"
  fi
  
  if [ -n "$CREATED_BY" ]; then
    echo "✅ Verified: createdBy was auto-set: $CREATED_BY"
  else
    echo "⚠️  Warning: createdBy was not auto-set"
  fi
else
  echo "❌ FAIL: Request failed with status $HTTP_CODE"
  
  # Check for validation errors
  if echo "$BODY" | jq -e '.details' > /dev/null 2>&1; then
    echo ""
    echo "Validation errors:"
    echo "$BODY" | jq -r '.details[] | "  - \(.path): \(.message)"' 2>/dev/null
  fi
  
  exit 1
fi

