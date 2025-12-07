#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Renumber files in a directory to maintain sequential ordering
 * Usage: node scripts/renumber.js [directory] [startNumber]
 */

const args = process.argv.slice(2);
const targetDir = args[0] || './android';
const startNumber = parseInt(args[1]) || 1;

function scanDirectory(dir, level = null) {
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
        const { data } = matter(content);
        files.push({
          path: fullPath,
          name: entry.name,
          number: data.number || 0,
          title: data.title || entry.name,
        });
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error.message);
      }
    }
  }
  
  return files;
}

function renumberFiles(files, startNumber) {
  // Sort by current number
  files.sort((a, b) => a.number - b.number);
  
  const renames = [];
  let currentNumber = startNumber;
  
  for (const file of files) {
    if (file.number !== currentNumber) {
      const newNumber = String(currentNumber).padStart(2, '0');
      const oldName = file.name;
      const newName = oldName.replace(/^\d+\.\s*/, `${newNumber}. `);
      
      renames.push({
        oldPath: file.path,
        newPath: path.join(path.dirname(file.path), newName),
        oldNumber: file.number,
        newNumber: currentNumber,
        title: file.title,
      });
    }
    currentNumber++;
  }
  
  return renames;
}

function updateFrontmatter(filePath, newNumber) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  
  data.number = newNumber;
  
  // Regenerate frontmatter
  const frontmatter = `---
number: ${data.number}
title: "${data.title}"
slug: "${data.slug}"
level: "${data.level}"
tags: [${Array.isArray(data.tags) ? data.tags.map(t => `"${t}"`).join(', ') : ''}]
prerequisites: [${Array.isArray(data.prerequisites) ? data.prerequisites.join(', ') : ''}]
estimated_minutes: ${data.estimated_minutes || 30}
contributors: [${Array.isArray(data.contributors) ? data.contributors.map(c => `"${c}"`).join(', ') : ''}]
${data.diagrams ? `diagrams: [${Array.isArray(data.diagrams) ? data.diagrams.map(d => `"${d}"`).join(', ') : ''}]` : ''}
${data.examples ? `examples: [${Array.isArray(data.examples) ? data.examples.map(e => `"${e}"`).join(', ') : ''}]` : ''}
canonical_id: "${data.canonical_id}"
---

${body}`;
  
  fs.writeFileSync(filePath, frontmatter, 'utf-8');
}

function main() {
  console.log(`Scanning directory: ${targetDir}`);
  console.log(`Starting number: ${startNumber}\n`);
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  const files = scanDirectory(targetDir);
  console.log(`Found ${files.length} files\n`);
  
  if (files.length === 0) {
    console.log('No files to renumber.');
    return;
  }
  
  // Group by directory
  const byDir = {};
  for (const file of files) {
    const dir = path.dirname(file.path);
    if (!byDir[dir]) {
      byDir[dir] = [];
    }
    byDir[dir].push(file);
  }
  
  // Renumber each directory separately
  for (const [dir, dirFiles] of Object.entries(byDir)) {
    console.log(`\nProcessing directory: ${dir}`);
    const renames = renumberFiles(dirFiles, startNumber);
    
    if (renames.length === 0) {
      console.log('  No renumbering needed.');
      continue;
    }
    
    console.log(`  ${renames.length} files need renumbering:\n`);
    
    for (const rename of renames) {
      console.log(`  ${rename.oldNumber} → ${rename.newNumber}: ${rename.title}`);
      console.log(`    ${path.basename(rename.oldPath)} → ${path.basename(rename.newPath)}`);
      
      // Update frontmatter
      updateFrontmatter(rename.oldPath, rename.newNumber);
      
      // Rename file
      fs.renameSync(rename.oldPath, rename.newPath);
    }
  }
  
  console.log('\n✅ Renumbering complete!');
  console.log('\n⚠️  Remember to:');
  console.log('  1. Update prerequisites in affected files');
  console.log('  2. Reindex the database: npm run setup-db');
  console.log('  3. Commit the changes');
}

main();



