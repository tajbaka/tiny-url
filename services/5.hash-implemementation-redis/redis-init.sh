#!/bin/bash

# Docker seeder script - runs inside Docker network to seed database
# This script waits for services to be ready, then calls the seeding API

set -e

NGINX_URL="http://redis-only-nginx"  # Use internal Docker network name
MAX_RETRIES=30
RETRY_INTERVAL=10

echo "🌱 Docker Database Seeder Starting..."
echo "🔗 Target URL: $NGINX_URL"

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local expected_status=${2:-200}
    
    if command -v curl >/dev/null 2>&1; then
        curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null
    else
        wget -q -O /dev/null --server-response "$url" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}'
    fi
}

# Wait for nginx to be ready
echo "⏳ Waiting for nginx load balancer to be ready..."
retry_count=0

while [ $retry_count -lt $MAX_RETRIES ]; do
    echo "🔍 Checking nginx health (attempt $((retry_count + 1))/$MAX_RETRIES)..."
    
    if status_code=$(check_url "$NGINX_URL/health"); then
        if [ "$status_code" = "200" ]; then
            echo "✅ Nginx is ready!"
            break
        else
            echo "⚠️  Nginx returned status: $status_code"
        fi
    else
        echo "❌ Failed to connect to nginx"
    fi
    
    if [ $retry_count -eq $((MAX_RETRIES - 1)) ]; then
        echo "💥 Failed to connect to nginx after $MAX_RETRIES attempts"
        exit 1
    fi
    
    echo "😴 Waiting ${RETRY_INTERVAL}s before retry..."
    sleep $RETRY_INTERVAL
    retry_count=$((retry_count + 1))
done

# Additional wait to ensure all services are fully ready
echo "⏳ Waiting additional 10s for all services to stabilize..."
sleep 10

# Call the seeding API
echo "🚀 Triggering database seed..."
FORCE_FLAG=""

# Check if force seeding is requested
if [ "$FORCE_SEED" = "true" ]; then
    FORCE_FLAG="?force=true"
    echo "🔄 Force seeding enabled"
fi

SEED_URL="${NGINX_URL}/api/admin/seed${FORCE_FLAG}"
echo "📡 Making request to: $SEED_URL"

# Make the seeding request
if command -v curl >/dev/null 2>&1; then
    RESPONSE=$(curl -s -X POST "$SEED_URL" \
        -H "Content-Type: application/json" \
        -w "\nHTTP_STATUS_CODE:%{http_code}" 2>/dev/null)
else
    # Fallback to wget if curl is not available
    RESPONSE=$(wget -q -O - --post-data="" \
        --header="Content-Type: application/json" \
        "$SEED_URL" 2>/dev/null)
    # wget doesn't easily give us status codes, so assume success if we get here
    HTTP_STATUS="200"
fi

# Extract HTTP status code (if using curl)
if command -v curl >/dev/null 2>&1; then
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS_CODE/d')
else
    BODY="$RESPONSE"
fi

echo "📊 Response (Status: ${HTTP_STATUS:-unknown}):"
if command -v jq >/dev/null 2>&1; then
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "$BODY"
fi

# Check if the request was successful
if [ "${HTTP_STATUS:-200}" = "200" ]; then
    echo "✅ Database seeding completed successfully!"
    echo "🎉 Seeder container finished successfully"
    exit 0
elif [ "$HTTP_STATUS" = "409" ]; then
    echo "⚠️  Another instance is currently seeding the database"
    echo "✅ Seeding process handled by another instance"
    exit 0
else
    echo "❌ Failed to seed database (HTTP ${HTTP_STATUS:-unknown})"
    echo "💥 Seeder container failed"
    exit 1
fi 