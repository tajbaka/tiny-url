#!/bin/bash

echo "🔥 Testing SQL Load Balancer with Round Robin Distribution"
echo "====================================================="

# Function to test load balancer health
test_load_balancer_health() {
    echo "1. Testing Load Balancer Health..."
    curl -s http://localhost:8080/health | jq '.'
    echo ""
}

# Function to check nginx status
test_nginx_status() {
    echo "2. Testing Nginx Status..."
    curl -s http://localhost:8080/nginx-status
    echo ""
}

# Function to test instance distribution
test_instance_distribution() {
    echo "3. Testing Instance Distribution (10 requests)..."
    echo "Instance ID distribution:"
    
    for i in {1..10}; do
        instance_id=$(curl -s http://localhost:8080/api/instance | jq -r '.instanceId')
        echo "Request $i: Instance $instance_id"
        sleep 0.1
    done
    echo ""
}

# Function to test URL shortening with load balancing
test_url_shortening() {
    echo "4. Testing URL Shortening with Load Balancing..."
    
    for i in {1..5}; do
        url="https://example.com/test-$i"
        echo "Shortening: $url"
        
        response=$(curl -s -X POST http://localhost:8080/api/shorten \
            -H "Content-Type: application/json" \
            -d "{\"longUrl\":\"$url\"}")
        
        short_url=$(echo $response | jq -r '.shortUrl')
        instance_id=$(echo $response | jq -r '.instanceId')
        from_cache=$(echo $response | jq -r '.fromCache')
        
        echo "  → Short URL: $short_url (Instance: $instance_id, Cache: $from_cache)"
        echo ""
        sleep 0.2
    done
}

# Function to show memory usage across instances
test_memory_usage() {
    echo "5. Memory Usage Across Instances..."
    
    for i in {1..3}; do
        echo "Getting memory from instance (round-robin):"
        curl -s http://localhost:8080/memory | jq '.'
        echo ""
        sleep 0.1
    done
}

# Function to test container health
test_container_health() {
    echo "6. Container Health Status..."
    docker ps --filter "name=sql-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    docker ps --filter "name=sql-nginx-lb" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    docker ps --filter "name=sql-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Main execution
echo "Starting SQL Load Balancer Tests..."
echo "Make sure containers are running: docker-compose up -d"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it for better output formatting:"
    echo "   brew install jq  (macOS)"
    echo "   apt-get install jq  (Ubuntu/Debian)"
    echo ""
fi

test_load_balancer_health
test_nginx_status
test_instance_distribution
test_url_shortening
test_memory_usage
test_container_health

echo "✅ SQL Load Balancer Test Complete!"
echo ""
echo "📊 To monitor logs in real-time:"
echo "   docker-compose logs -f"
echo ""
echo "🔍 To see nginx access logs:"
echo "   docker-compose logs sql-nginx-lb" 