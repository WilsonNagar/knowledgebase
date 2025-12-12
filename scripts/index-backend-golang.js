#!/usr/bin/env node

/**
 * Quick script to index backend and golang knowledge bases
 * Usage: node scripts/index-backend-golang.js
 * 
 * Or if dev server is running:
 * curl -X POST http://localhost:3000/api/index -H "Content-Type: application/json" -d '{"knowledgebase":"backend"}'
 * curl -X POST http://localhost:3000/api/index -H "Content-Type: application/json" -d '{"knowledgebase":"golang"}'
 */

const http = require('http');

const knowledgeBases = ['backend', 'golang'];

function indexKnowledgeBase(kb) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ knowledgebase: kb });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/index',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${kb} indexed successfully`);
          resolve();
        } else {
          console.error(`❌ Failed to index ${kb}:`, body);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error indexing ${kb}:`, error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Indexing backend and golang knowledge bases...\n');
  console.log('Make sure the dev server is running (npm run dev)\n');

  for (const kb of knowledgeBases) {
    try {
      await indexKnowledgeBase(kb);
    } catch (error) {
      console.log(`\n💡 Alternative: Run manually:`);
      console.log(`   curl -X POST http://localhost:3000/api/index -H "Content-Type: application/json" -d '{"knowledgebase":"${kb}"}'`);
      process.exit(1);
    }
  }

  console.log('\n🎉 All knowledge bases indexed successfully!');
  console.log('Refresh your browser to see backend and golang in the UI.');
}

main();

