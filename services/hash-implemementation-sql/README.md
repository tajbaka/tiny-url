# URL Shortener Service - Horizontal Scaling with Load Balancing

This implementation demonstrates horizontal scaling of a URL shortener service using Docker containers and nginx load balancing.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Client       │───▶│ Nginx Load       │───▶│ Hash Service    │
│    Requests     │    │ Balancer         │    │ Instance 1      │
│                 │    │ (Round Robin)    │    │ Port: 3000      │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │───▶│ Hash Service    │
                       │                  │    │ Instance 2      │
                       │                  │    │ Port: 3000      │
                       │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │───▶│ Hash Service    │
                       │                  │    │ Instance 3      │
                       │                  │    │ Port: 3000      │
                       │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │───▶│ Hash Service    │
                       └──────────────────┘    │ Instance 4      │
                                               │ Port: 3000      │
                                               └─────────────────┘
```

## Components

- **4 Hash Service Instances**: Node.js applications running the URL shortening logic
- **Nginx Load Balancer**: Distributes incoming requests using round-robin algorithm
- **PostgreSQL Database**: Shared database for all service instances
- **Docker Network**: Allows inter-container communication
- **Health Checks**: Monitors the health of all services

## Quick Start

### 1. Start the Services

```bash
# Build and start all containers
npm run docker:up

# Or manually:
docker-compose up -d
```

### 2. Verify Load Balancing

```bash
# Run comprehensive load balancer tests
npm run test:load-balancer

# Or manually test instance distribution:
npm run instances:check
```

### 3. Test URL Shortening

```bash
# Shorten a URL (will be handled by different instances)
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com"}'

# Response includes instanceId to see which instance handled the request:
# {"shortUrl":"AbC123","instanceId":"2","fromCache":false}
```

## Available Scripts

### Docker Management

```bash
npm run docker:build     # Build all containers
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:restart   # Restart all services
npm run docker:clean     # Remove all containers and volumes
```

### Monitoring

```bash
npm run docker:logs         # View all service logs
npm run docker:logs:nginx   # View nginx logs only
npm run docker:logs:services # View hash service logs only
npm run docker:stats        # View resource usage
```

### Health Checks

```bash
npm run health:check        # Check load balancer health
npm run instances:check     # Check individual instance info
npm run test:load-balancer  # Run comprehensive tests
```

## API Endpoints

### Load Balancer Endpoints

- `GET /health` - Load balancer health check
- `GET /nginx-status` - Nginx status information

### Service Endpoints (Load Balanced)

- `POST /api/shorten` - Shorten a URL
- `GET /api/instance` - Get instance information
- `GET /memory` - Memory usage statistics
- `GET /:shortUrl` - Redirect to original URL

## Load Balancing Verification

### 1. Instance Distribution Test

```bash
# This should show requests distributed across instances 1, 2, 3, 4
npm run instances:check
```

### 2. Response Headers

Each response includes instance identification:

```
X-Instance-ID: 1
X-Service-Name: hash-service
```

### 3. URL Shortening with Instance Tracking

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://github.com"}' | jq '.'
```

Response shows which instance handled the request:

```json
{
  "shortUrl": "AbC123",
  "instanceId": "2",
  "fromCache": false
}
```

## Container Configuration

### Resource Limits

- **Hash Services**: 1.0 CPU, 512MB RAM each (4 instances)
- **Nginx**: 0.5 CPU, 256MB RAM
- **PostgreSQL**: 1.0 CPU, 512MB RAM
- **Total**: ~5.5 CPUs, ~2.8GB RAM

### Health Checks

- All services have built-in health checks
- Nginx retries failed requests on other instances
- Automatic container restart on failure

## Scaling Benefits

1. **High Availability**: If one instance fails, others continue serving
2. **Load Distribution**: Requests spread evenly across instances
3. **Resource Efficiency**: Multiple smaller containers vs. one large one
4. **Easy Scaling**: Add more instances by modifying docker-compose.yml

## Monitoring & Debugging

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f sql-service-1
docker-compose logs -f sql-nginx-lb
```

### Container Status

```bash
docker ps --filter "name=sql-service"
docker ps --filter "name=sql-nginx-lb"
```

### Resource Usage

```bash
npm run docker:stats
```

## Troubleshooting

### Services Not Starting

```bash
# Check container status
docker-compose ps

# View startup logs
docker-compose logs

# Restart specific service
docker-compose restart sql-service-1
```

### Load Balancer Not Working

```bash
# Check nginx configuration
docker-compose exec sql-nginx-lb nginx -t

# View nginx access logs
docker-compose logs sql-nginx-lb
```

### Port Conflicts

```bash
# Check if port 8080 is in use
lsof -i :8080

# Change port in docker-compose.yml if needed
```

## Development

The services run with nodemon for auto-restart on code changes. Source files are mounted as volumes for development.

```bash
# Make changes to src/index.js - containers will auto-restart
# View logs to see changes take effect
npm run docker:logs:services
```

## Performance Testing

Use the included Artillery configuration for load testing:

```bash
npm run load-test
```

This tests the load balancer under various traffic patterns and measures response times across all instances.

## Port Configuration

### External Ports (Host → Container)

- **Load Balancer**: `8080 → 80` (Nginx)
- **PostgreSQL**: `5433 → 5432` (Direct database access)

### Internal Ports (Container Network)

- **Service Instances**: Port `3000` each
- **Nginx**: Port `80`
- **PostgreSQL**: Port `5432`

All service instances communicate through the `sql-network` Docker network.
