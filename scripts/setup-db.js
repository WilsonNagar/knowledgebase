#!/usr/bin/env node

/**
 * Setup and index the knowledge base database
 * 
 * Note: This script uses the compiled JavaScript from lib/db.js
 * Make sure to build first: npm run build
 * Or use the API endpoint: POST /api/index
 */

async function main() {
  const args = process.argv.slice(2);
  const knowledgebasePath = args[0] || './android';

  console.log('Setting up database...');
  console.log(`Indexing: ${knowledgebasePath}\n`);

  try {
    // Try to use the compiled version first
    let indexFiles;
    try {
      // In production/build, use compiled JS
      indexFiles = require('../.next/server/lib/db.js').indexFiles;
    } catch (e) {
      // In development, we need to use ts-node or the API
      console.log('⚠️  Compiled files not found. Please use one of:');
      console.log('   1. Build first: npm run build');
      console.log('   2. Start dev server, then use: curl -X POST http://localhost:3000/api/index');
      console.log('   3. Start dev server and use the admin UI');
      process.exit(1);
    }
    
    indexFiles(knowledgebasePath);
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    console.log('\n💡 Alternative: Start the dev server and use:');
    console.log('   curl -X POST http://localhost:3000/api/index');
    process.exit(1);
  }
}

main();

