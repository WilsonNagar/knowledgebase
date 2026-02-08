#!/usr/bin/env node

/**
 * GitHub Webhook Deployment Server
 * Listens for GitHub webhook events and triggers deployment
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration from environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'change-this-secret';
const DEPLOY_PATH = process.env.DEPLOY_PATH || '/srv/docker/projects/knowledge-base';
const PORT = process.env.WEBHOOK_PORT || 9000;
const BRANCH = process.env.DEPLOY_BRANCH || 'main';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function verifySignature(payload, signature) {
  if (!signature) {
    log('Warning: No signature provided', 'yellow');
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

async function deploy() {
  log('Starting deployment...', 'blue');
  
  try {
    // Step 1: Pull latest code
    log('Pulling latest code...', 'blue');
    await execAsync(`cd ${DEPLOY_PATH} && git fetch origin`, { timeout: 30000 });
    await execAsync(`cd ${DEPLOY_PATH} && git reset --hard origin/${BRANCH}`, { timeout: 30000 });
    
    // Step 2: Rebuild app container
    log('Rebuilding app container...', 'blue');
    await execAsync(
      `cd ${DEPLOY_PATH} && docker compose -f docker-compose.yml build --no-cache app`,
      { timeout: 600000 } // 10 minutes timeout
    );
    
    // Step 3: Restart app container
    log('Restarting app container...', 'blue');
    await execAsync(
      `cd ${DEPLOY_PATH} && docker compose -f docker-compose.yml up -d app`,
      { timeout: 60000 }
    );
    
    // Step 4: Clean up old images
    log('Cleaning up old Docker images...', 'blue');
    await execAsync('docker image prune -f', { timeout: 60000 });
    
    // Step 5: Verify deployment
    log('Waiting for app to be ready...', 'blue');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const { stdout } = await execAsync(
      `cd ${DEPLOY_PATH} && docker compose -f docker-compose.yml ps`,
      { timeout: 30000 }
    );
    
    log('Container status:', 'blue');
    console.log(stdout);
    
    // Health check
    try {
      const healthCheck = await execAsync('curl -f http://localhost:3001/api/health', { timeout: 10000 });
      log('Health check passed!', 'green');
    } catch (error) {
      log('Health check failed, but deployment completed', 'yellow');
    }
    
    log('Deployment completed successfully!', 'green');
    return { success: true, message: 'Deployment completed successfully' };
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'red');
    log(error.stderr || error.stdout || '', 'red');
    return { success: false, message: error.message };
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // Verify webhook signature
        const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
        
        if (WEBHOOK_SECRET !== 'change-this-secret' && !verifySignature(body, signature)) {
          log('Unauthorized webhook request - invalid signature', 'red');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        
        const payload = JSON.parse(body);
        
        // Check if it's a push event to the correct branch
        const ref = payload.ref || '';
        const branchName = ref.replace('refs/heads/', '');
        
        if (payload.ref && !ref.includes(BRANCH)) {
          log(`Push to ${branchName}, not ${BRANCH}. Skipping deployment.`, 'yellow');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: `Not ${BRANCH} branch, skipping deployment` }));
          return;
        }
        
        // Handle ping event (GitHub webhook test)
        if (payload.zen) {
          log('Received GitHub webhook ping', 'blue');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Webhook is working!' }));
          return;
        }
        
        log(`Received webhook for ${branchName} branch`, 'blue');
        
        // Start deployment (don't wait for it to complete)
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Deployment started' }));
        
        // Run deployment asynchronously
        deploy().then(result => {
          if (result.success) {
            log('Deployment completed successfully', 'green');
          } else {
            log(`Deployment failed: ${result.message}`, 'red');
          }
        });
        
      } catch (error) {
        log(`Error processing webhook: ${error.message}`, 'red');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'deploy-webhook' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  log(`Webhook server listening on port ${PORT}`, 'green');
  log(`Deploy path: ${DEPLOY_PATH}`, 'blue');
  log(`Branch: ${BRANCH}`, 'blue');
  log(`Webhook secret: ${WEBHOOK_SECRET === 'change-this-secret' ? '⚠️  DEFAULT - CHANGE THIS!' : '✓ Set'}`, 
      WEBHOOK_SECRET === 'change-this-secret' ? 'yellow' : 'green');
});

// Handle errors
server.on('error', (error) => {
  log(`Server error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully', 'yellow');
  server.close(() => {
    log('Server closed', 'green');
    process.exit(0);
  });
});
