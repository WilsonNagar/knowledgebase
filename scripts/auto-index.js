#!/usr/bin/env node

/**
 * Auto-index script that indexes all knowledge bases and projects
 * This script waits for the app to be ready and then indexes all content
 */

const http = require('http');

const APP_URL = process.env.APP_URL || 'http://app:3000';
const MAX_RETRIES = 60; // Increased to 60 retries (2 minutes)
const RETRY_DELAY = 2000; // 2 seconds

const knowledgeBases = [
  'android',
  'backend',
  'devops',
  'golang',
  'computer_science',
  'kotlin'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function waitForApp() {
  console.log('Waiting for app to be ready...');
  console.log(`Checking ${APP_URL}/api/health`);
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await makeRequest(`${APP_URL}/api/health`);
      if (response.status === 200) {
        console.log('\n✓ App is ready!');
        return true;
      }
    } catch (error) {
      // App not ready yet - this is expected
      if (i % 5 === 0 && i > 0) {
        console.log(`\n[${i * RETRY_DELAY / 1000}s] Still waiting... (${error.message})`);
      }
    }
    
    if (i < MAX_RETRIES - 1) {
      if (i % 5 === 0 && i > 0) {
        process.stdout.write(`\n[${i * RETRY_DELAY / 1000}s]`);
      }
      process.stdout.write('.');
      await sleep(RETRY_DELAY);
    }
  }
  
  console.log(`\n✗ App did not become ready after ${MAX_RETRIES * RETRY_DELAY / 1000} seconds`);
  console.log('   Continuing anyway - you may need to manually index later');
  return false;
}

async function indexKnowledgeBase(knowledgebase) {
  try {
    console.log(`Indexing ${knowledgebase}...`);
    const response = await makeRequest(`${APP_URL}/api/index`, {
      method: 'POST',
      body: { knowledgebase }
    });
    
    if (response.status === 200) {
      console.log(`  ✓ ${knowledgebase} indexed successfully`);
      return true;
    } else {
      console.log(`  ✗ Failed to index ${knowledgebase}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error indexing ${knowledgebase}: ${error.message}`);
    return false;
  }
}

async function indexProjects() {
  try {
    console.log('Indexing projects...');
    const response = await makeRequest(`${APP_URL}/api/projects/index`, {
      method: 'POST',
      body: { path: './projects' }
    });
    
    if (response.status === 200) {
      console.log('  ✓ Projects indexed successfully');
      return true;
    } else {
      console.log(`  ✗ Failed to index projects: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error indexing projects: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting auto-indexing...\n');
  
  // Wait for app to be ready
  const appReady = await waitForApp();
  if (!appReady) {
    console.error('\n⚠️  Warning: App may not be fully ready, but attempting to index anyway...');
  }
  
  // Wait a bit more for the app to fully initialize
  console.log('Waiting for app to fully initialize...');
  await sleep(5000);
  
  // Index all knowledge bases
  console.log('\n📚 Indexing knowledge bases...\n');
  let successCount = 0;
  for (const kb of knowledgeBases) {
    const success = await indexKnowledgeBase(kb);
    if (success) successCount++;
    await sleep(500); // Small delay between requests
  }
  
  // Index projects
  console.log('\n📁 Indexing projects...\n');
  await indexProjects();
  
  console.log('\n✅ Auto-indexing complete!');
  console.log(`   Indexed ${successCount}/${knowledgeBases.length} knowledge bases`);
  console.log('   Your knowledge base is ready to use!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

