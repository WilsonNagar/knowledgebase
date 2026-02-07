# Docker Commands Quick Reference

Quick reference for common Docker operations with this project.

## Initial Setup

```bash
# Build and start all containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Updating Code (Rebuild App Only)

```bash
# Rebuild only the app container (postgres stays untouched)
docker-compose build --no-cache app
docker-compose up -d app

# Or in one command
docker-compose up -d --build app
```

## Managing Services

```bash
# Stop all services
docker-compose down

# Stop but keep containers (preserves database)
docker-compose stop

# Start stopped services
docker-compose start

# Restart a specific service
docker-compose restart app

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx
```

## Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U knowledgebase -d knowledgebase

# Backup database
docker-compose exec postgres pg_dump -U knowledgebase knowledgebase > backup.sql

# Restore database
docker-compose exec -T postgres psql -U knowledgebase knowledgebase < backup.sql

# Backup data directory
tar czf postgres_backup_$(date +%Y%m%d).tar.gz -C ./data/postgres .
```

## Content Indexing

```bash
# Reindex via API
curl -X POST http://localhost/api/index -H "Content-Type: application/json" -d '{"knowledgebase": "android"}'

# Run init container again
docker-compose run --rm init
```

## Debugging

```bash
# Execute command in app container
docker-compose exec app sh

# View container resource usage
docker-compose stats

# Inspect container
docker inspect knowledgebase-app

# View container logs directly
docker logs knowledgebase-app -f

# Check network connectivity
docker network inspect knowledgestack_knowledgebase-network
```

## Cleanup

```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune -f

# Remove unused volumes (⚠️ be careful)
docker volume prune -f

# Full cleanup (⚠️ removes everything including database)
docker-compose down -v
docker system prune -a
```

## Health Checks

```bash
# Check app health
curl http://localhost/health

# Check app directly
curl http://localhost:3000/health

# Check PostgreSQL
docker-compose exec postgres pg_isready -U knowledgebase
```

## Environment Variables

```bash
# View current environment
docker-compose config

# Override environment for single command
POSTGRES_PASSWORD=newpass docker-compose up -d
```

## Production Deployment

```bash
# Build without cache for clean build
docker-compose build --no-cache

# Start in detached mode
docker-compose up -d

# Follow logs
docker-compose logs -f app
```
