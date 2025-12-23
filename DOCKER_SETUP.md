# Docker Setup with PostgreSQL and Nginx

This project now uses Docker Compose to run the application with PostgreSQL database and Nginx reverse proxy.

## Architecture

- **PostgreSQL**: Database server storing all knowledge base data
- **App**: Next.js application server
- **Nginx**: Reverse proxy that routes requests to the app

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)

## Quick Start

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Initialize the database:**
   The database schema will be automatically created when the app starts. However, you need to index your content:
   
   ```bash
   # Index files (replace 'android' with your knowledgebase)
   curl -X POST http://localhost/api/index -H "Content-Type: application/json" -d '{"knowledgebase": "android"}'
   
   # Index projects
   curl -X POST http://localhost/api/projects/index -H "Content-Type: application/json" -d '{"path": "./projects"}'
   ```

3. **Access the application:**
   - Application: http://localhost (via Nginx)
   - Direct app access: http://localhost:3000
   - PostgreSQL: localhost:5432

## Services

### PostgreSQL
- **Port**: 5432
- **Database**: knowledgebase
- **User**: knowledgebase
- **Password**: knowledgebase_password (change in production!)
- **Volume**: `postgres_data` (persists data)

### Application
- **Port**: 3000 (internal)
- **Environment Variables**: Set in docker-compose.yml
- **Volumes**: All knowledge base directories are mounted

### Nginx
- **Port**: 80
- **Configuration**: `nginx.conf`
- **Routes**: All requests to `/` are proxied to the app

## Environment Variables

You can customize the database connection by setting these environment variables in `docker-compose.yml`:

- `DATABASE_URL`: Full PostgreSQL connection string
- `POSTGRES_HOST`: Database host (default: postgres)
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_USER`: Database user (default: knowledgebase)
- `POSTGRES_PASSWORD`: Database password (default: knowledgebase_password)
- `POSTGRES_DB`: Database name (default: knowledgebase)

## Data Migration

If you have existing SQLite data, you'll need to:

1. Start the services: `docker-compose up -d`
2. Wait for PostgreSQL to be ready
3. Index your content using the API endpoints (see Quick Start)
4. The data will be stored in PostgreSQL and shared across all users

## Development

For local development without Docker:

1. Install dependencies: `npm install`
2. Set up PostgreSQL locally
3. Set environment variables (see `.env.example`)
4. Run: `npm run dev`

## Production Considerations

Before deploying to production:

1. **Change default passwords** in `docker-compose.yml`
2. **Use environment variables** for sensitive data (don't commit passwords)
3. **Set up SSL/TLS** in Nginx configuration
4. **Configure proper backups** for PostgreSQL
5. **Set resource limits** for containers
6. **Use a secrets management system** for credentials

## Troubleshooting

### Database connection errors
- Check if PostgreSQL container is running: `docker-compose ps`
- Verify connection string in environment variables
- Check PostgreSQL logs: `docker-compose logs postgres`

### App not starting
- Check app logs: `docker-compose logs app`
- Verify database is healthy: `docker-compose ps postgres`
- Check if port 3000 is available

### Nginx not routing
- Check Nginx logs: `docker-compose logs nginx`
- Verify nginx.conf syntax
- Check if app container is running

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

