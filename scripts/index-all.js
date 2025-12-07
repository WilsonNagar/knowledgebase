#!/usr/bin/env node

/**
 * Index all knowledge bases
 * This script uses the compiled Next.js server code if available,
 * otherwise provides instructions for using the API
 */

const fs = require('fs');
const path = require('path');

console.log('Indexing knowledge bases...\n');

// Try to use the compiled version
let indexFiles;
try {
  // Try to load from .next/server/lib/db.js (compiled Next.js)
  const dbPath = path.join(__dirname, '..', '.next', 'server', 'lib', 'db.js');
  if (fs.existsSync(dbPath)) {
    const dbModule = require(dbPath);
    indexFiles = dbModule.indexFiles;
    console.log('✅ Using compiled Next.js server code\n');
  } else {
    throw new Error('Compiled code not found');
  }
} catch (e) {
  console.log('⚠️  Compiled files not found.');
  console.log('\n💡 Please use one of these methods:\n');
  console.log('1. Start the dev server (npm run dev), then run:');
  console.log('   curl -X POST http://localhost:3000/api/index \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"knowledgebase":"computer_science"}\'\n');
  console.log('2. Or visit the admin page at http://localhost:3000/admin\n');
  console.log('3. Or build first (npm run build), then run this script again\n');
  process.exit(1);
}

try {
  console.log('Indexing Android...');
  indexFiles('./android');
  console.log('✅ Android indexed\n');
  
  console.log('Indexing Computer Science...');
  indexFiles('./computer_science');
  console.log('✅ Computer Science indexed\n');
  
  console.log('🎉 All knowledge bases indexed successfully!');
} catch (error) {
  console.error('❌ Error indexing:', error.message);
  console.log('\n💡 Alternative: Use the API endpoint when dev server is running');
  process.exit(1);
}

