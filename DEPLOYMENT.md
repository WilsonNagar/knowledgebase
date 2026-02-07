# Deployment Guide

This guide covers automated deployment strategies for updating your Docker containers when code is merged to the master branch.

## Overview

The deployment strategy involves:
1. **CI/CD Pipeline**: Automatically triggers on merge to master
2. **Server-side Webhook/SSH**: Receives notification and rebuilds containers
3. **Zero-downtime**: Rolling updates with health checks

## Architecture

```
GitHub/GitLab → CI/CD Pipeline → Server (via SSH/Webhook) → Docker Compose → Updated Containers
```

## Option 1: GitHub Actions + SSH Deployment (Recommended)

This approach uses GitHub Actions to SSH into your server and rebuild containers.

### Setup Steps

1. **Generate SSH Key Pair** (on your server):
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
```

2. **Add Public Key to Server**:
```bash
# Copy public key to authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

3. **Add Secrets to GitHub Repository**:
   - Go to: Settings → Secrets and variables → Actions
   - Add these secrets:
     - `DEPLOY_HOST`: Your server IP or domain (e.g., `192.168.1.100` or `example.com`)
     - `DEPLOY_USER`: SSH username (e.g., `deploy` or `ubuntu`)
     - `DEPLOY_SSH_KEY`: Contents of `~/.ssh/github_actions_deploy` (private key)
     - `DEPLOY_PATH`: Path to your project on server (e.g., `/home/deploy/knowledgebase`)

4. **Create GitHub Actions Workflow**:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches:
      - master
  workflow_dispatch: # Allows manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}
      
      - name: Add server to known hosts
        run: |
          ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts
      
      - name: Deploy to server
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
            set -e
            cd ${{ secrets.DEPLOY_PATH }}
            
            # Pull latest code
            git fetch origin
            git reset --hard origin/master
            
            # Rebuild and restart only the app container (postgres stays untouched)
            docker-compose build --no-cache app
            docker-compose up -d app
            
            # Run database migrations if needed (optional)
            # docker-compose exec app npm run migrate
            
            # Reindex content if needed (optional)
            # docker-compose run --rm init
            
            # Clean up old images
            docker image prune -f
            
            echo "Deployment completed successfully"
          EOF
      
      - name: Verify deployment
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
            cd ${{ secrets.DEPLOY_PATH }}
            docker-compose ps
            curl -f http://localhost/health || exit 1
          EOF
```

### Server Setup

On your server, ensure:
1. Docker and Docker Compose are installed
2. Project is cloned: `git clone <repo-url> /home/deploy/knowledgebase`
3. `.env` file is configured
4. Initial deployment: `cd /home/deploy/knowledgebase && docker-compose up -d --build`

## Option 2: Webhook-Based Deployment

This approach uses a webhook server on your deployment machine.

### Setup Steps

1. **Create Webhook Server** (on your server):

Create `deploy-webhook.js`:

```javascript
const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-token';
const DEPLOY_PATH = process.env.DEPLOY_PATH || '/home/deploy/knowledgebase';
const PORT = process.env.WEBHOOK_PORT || 9000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Verify secret (if using GitHub webhook)
        const signature = req.headers['x-hub-signature-256'];
        if (signature) {
          const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
          const digest = 'sha256=' + hmac.update(body).digest('hex');
          if (signature !== digest) {
            res.writeHead(401);
            res.end('Unauthorized');
            return;
          }
        }
        
        // Only deploy on master branch
        if (payload.ref === 'refs/heads/master' || payload.branch === 'master') {
          console.log('Deployment triggered');
          
          exec(`cd ${DEPLOY_PATH} && git pull && docker-compose build --no-cache app && docker-compose up -d app && docker image prune -f`, 
            (error, stdout, stderr) => {
              if (error) {
                console.error(`Deployment error: ${error}`);
                res.writeHead(500);
                res.end(`Deployment failed: ${error.message}`);
                return;
              }
              console.log(stdout);
              res.writeHead(200);
              res.end('Deployment successful');
            }
          );
        } else {
          res.writeHead(200);
          res.end('Not master branch, skipping deployment');
        }
      } catch (error) {
        res.writeHead(400);
        res.end(`Bad request: ${error.message}`);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
```

2. **Run Webhook Server** (using PM2 or systemd):

```bash
# Install PM2
npm install -g pm2

# Start webhook server
pm2 start deploy-webhook.js --name deploy-webhook
pm2 save
pm2 startup
```

3. **Configure GitHub Webhook**:
   - Go to: Repository → Settings → Webhooks → Add webhook
   - Payload URL: `http://your-server-ip:9000/deploy`
   - Content type: `application/json`
   - Secret: Same as `WEBHOOK_SECRET` in your webhook server
   - Events: Select "Just the push event"
   - Active: ✓

4. **Secure the Webhook** (optional but recommended):
   - Use nginx reverse proxy with SSL
   - Or use a firewall to restrict access to the webhook port

## Option 3: GitLab CI/CD

If using GitLab, create `.gitlab-ci.yml`:

```yaml
stages:
  - deploy

deploy:
  stage: deploy
  only:
    - master
  script:
    - |
      ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        cd $DEPLOY_PATH
        git pull origin master
        docker-compose build --no-cache app
        docker-compose up -d app
        docker image prune -f
      EOF
  environment:
    name: production
```

Add CI/CD variables in GitLab:
- `DEPLOY_USER`: SSH username
- `DEPLOY_HOST`: Server IP/domain
- `DEPLOY_PATH`: Project path on server
- `SSH_PRIVATE_KEY`: Private SSH key

## Option 4: Simple Script-Based Deployment

For a simpler approach, create a deployment script on your server:

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

DEPLOY_PATH="/home/deploy/knowledgebase"
cd "$DEPLOY_PATH"

echo "Pulling latest code..."
git pull origin master

echo "Rebuilding app container..."
docker-compose build --no-cache app

echo "Restarting app container..."
docker-compose up -d app

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment completed!"
docker-compose ps
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then in your CI/CD pipeline, just SSH and run:
```bash
ssh user@server 'cd /home/deploy/knowledgebase && ./deploy.sh'
```

## Best Practices

### 1. Health Checks

Add health checks to ensure deployment succeeded:

```bash
# In your deployment script
sleep 5
curl -f http://localhost/health || {
  echo "Health check failed, rolling back..."
  docker-compose rollback app
  exit 1
}
```

### 2. Database Migrations

If you have migrations, run them before restarting:

```bash
docker-compose exec app npm run migrate
```

### 3. Zero-Downtime Deployment

For zero-downtime, use a blue-green deployment strategy:

```bash
# Start new container with different name
docker-compose -f docker-compose.yml -f docker-compose.blue.yml up -d app-blue

# Wait for health check
sleep 10
curl -f http://localhost:3001/health || exit 1

# Switch nginx to new container
# Update nginx config and reload

# Stop old container
docker-compose stop app
```

### 4. Rollback Strategy

Keep previous image tags for quick rollback:

```bash
# Tag current image before update
docker tag knowledgebase-app:latest knowledgebase-app:previous

# If deployment fails, rollback:
docker tag knowledgebase-app:previous knowledgebase-app:latest
docker-compose up -d app
```

### 5. Notifications

Add notifications for deployment status:

```bash
# Slack notification example
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Deployment to production completed successfully"}'
```

## Security Considerations

1. **SSH Keys**: Use dedicated deploy keys, not personal SSH keys
2. **Secrets**: Never commit secrets to repository
3. **Webhook Security**: Always verify webhook signatures
4. **Firewall**: Restrict access to deployment endpoints
5. **SSL/TLS**: Use HTTPS for webhooks in production
6. **Least Privilege**: Deploy user should have minimal permissions

## Troubleshooting

### Deployment fails silently
- Check logs: `docker-compose logs app`
- Verify SSH connection works manually
- Check disk space: `df -h`
- Check Docker: `docker system df`

### Container won't start
- Check environment variables: `docker-compose config`
- Verify database is healthy: `docker-compose ps postgres`
- Check port conflicts: `netstat -tulpn | grep 3000`

### Database connection issues
- Verify `POSTGRES_HOST` is set to `postgres` (container name)
- Check network: `docker network inspect knowledgestack_knowledgebase-network`
- Test connection: `docker-compose exec app node -e "require('./lib/db').getDb().query('SELECT 1')"`

## Monitoring

Set up monitoring to track deployments:

```bash
# Add to deployment script
echo "$(date): Deployment completed" >> /var/log/deployments.log
```

Or use a monitoring service like:
- Sentry for error tracking
- Datadog for metrics
- Grafana for dashboards

## Quick Reference

```bash
# Manual deployment
cd /path/to/project
git pull
docker-compose build --no-cache app
docker-compose up -d app

# Check status
docker-compose ps
docker-compose logs -f app

# Rollback
docker-compose down app
docker-compose up -d app
```
