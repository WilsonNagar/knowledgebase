#!/usr/bin/env node

/**
 * Index AOSP knowledge base files
 * This script directly indexes AOSP files
 */

const { indexFiles } = require('../lib/db');
const path = require('path');

async function main() {
  try {
    console.log('Indexing AOSP knowledge base...\n');
    
    const aospPath = path.join(__dirname, '..', 'aosp');
    await indexFiles(aospPath);
    
    console.log('\n✅ AOSP knowledge base indexed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error indexing AOSP:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Handle the promise
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

