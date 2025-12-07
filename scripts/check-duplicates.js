#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const stringSimilarity = require('string-similarity');

/**
 * Check for duplicate or similar content across knowledge base files
 * Usage: node scripts/check-duplicates.js [directory] [threshold]
 */

const args = process.argv.slice(2);
const targetDir = args[0] || './android';
const threshold = parseFloat(args[1]) || 0.6;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = scanDirectory(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data, content: body } = matter(content);
        files.push({
          path: fullPath,
          canonical_id: data.canonical_id,
          slug: data.slug,
          title: data.title || entry.name,
          level: data.level,
          tags: Array.isArray(data.tags) ? data.tags : [],
          content: body.substring(0, 2000), // First 2000 chars for comparison
        });
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error.message);
      }
    }
  }
  
  return files;
}

function calculateSimilarity(file1, file2) {
  // Title similarity
  const titleSim = stringSimilarity.compareTwoStrings(
    file1.title.toLowerCase(),
    file2.title.toLowerCase()
  );
  
  // Content similarity
  const contentSim = stringSimilarity.compareTwoStrings(
    file1.content.toLowerCase(),
    file2.content.toLowerCase()
  );
  
  // Tag similarity
  const tags1 = file1.tags.map(t => t.toLowerCase());
  const tags2 = file2.tags.map(t => t.toLowerCase());
  const commonTags = tags1.filter(t => tags2.includes(t));
  const tagSim = tags1.length > 0 && tags2.length > 0
    ? (commonTags.length * 2) / (tags1.length + tags2.length)
    : 0;
  
  // Weighted average
  return (titleSim * 0.4 + contentSim * 0.4 + tagSim * 0.2);
}

function checkDuplicates(files) {
  const duplicates = [];
  const checked = new Set();
  
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const file1 = files[i];
      const file2 = files[j];
      
      const key = `${file1.canonical_id}-${file2.canonical_id}`;
      if (checked.has(key)) continue;
      checked.add(key);
      
      // Check canonical_id
      if (file1.canonical_id === file2.canonical_id) {
        duplicates.push({
          type: 'canonical_id',
          file1,
          file2,
          similarity: 1.0,
        });
        continue;
      }
      
      // Check slug (if same knowledgebase)
      if (file1.slug === file2.slug && file1.level === file2.level) {
        duplicates.push({
          type: 'slug',
          file1,
          file2,
          similarity: 1.0,
        });
        continue;
      }
      
      // Check similarity
      const similarity = calculateSimilarity(file1, file2);
      if (similarity >= threshold) {
        duplicates.push({
          type: 'similarity',
          file1,
          file2,
          similarity,
        });
      }
    }
  }
  
  return duplicates;
}

function main() {
  console.log(`Scanning directory: ${targetDir}`);
  console.log(`Similarity threshold: ${threshold}\n`);
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  const files = scanDirectory(targetDir);
  console.log(`Found ${files.length} files\n`);
  
  if (files.length < 2) {
    console.log('Not enough files to check for duplicates.');
    return;
  }
  
  const duplicates = checkDuplicates(files);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }
  
  console.log(`⚠️  Found ${duplicates.length} potential duplicate(s):\n`);
  
  // Group by type
  const byType = {
    canonical_id: [],
    slug: [],
    similarity: [],
  };
  
  for (const dup of duplicates) {
    byType[dup.type].push(dup);
  }
  
  // Report canonical_id duplicates
  if (byType.canonical_id.length > 0) {
    console.log('🔴 CANONICAL ID DUPLICATES (CRITICAL):');
    for (const dup of byType.canonical_id) {
      console.log(`\n  ID: ${dup.file1.canonical_id}`);
      console.log(`    ${dup.file1.path}`);
      console.log(`    ${dup.file2.path}`);
    }
    console.log('');
  }
  
  // Report slug duplicates
  if (byType.slug.length > 0) {
    console.log('🟡 SLUG DUPLICATES:');
    for (const dup of byType.slug) {
      console.log(`\n  Slug: ${dup.file1.slug}`);
      console.log(`    ${dup.file1.path}`);
      console.log(`    ${dup.file2.path}`);
    }
    console.log('');
  }
  
  // Report similar content
  if (byType.similarity.length > 0) {
    console.log('🟠 SIMILAR CONTENT:');
    for (const dup of byType.similarity) {
      console.log(`\n  Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
      console.log(`    "${dup.file1.title}" (${dup.file1.path})`);
      console.log(`    "${dup.file2.title}" (${dup.file2.path})`);
    }
    console.log('');
  }
  
  console.log('💡 Recommendations:');
  console.log('  - Review similar files and consider merging or cross-linking');
  console.log('  - Ensure canonical_id and slug are unique');
  console.log('  - Update prerequisites to link related content');
  
  process.exit(duplicates.length > 0 ? 1 : 0);
}

main();



