#!/usr/bin/env node

/**
 * Fix canonical_ids to be unique across all levels
 * Format: android-{level}-{number}
 * Example: android-beginner-01, android-intermediate-01
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const levelMap = {
  '01_beginners': 'beginner',
  '02_intermediate': 'intermediate',
  '03_advanced': 'advanced',
  '04_overachiever': 'overachiever',
};

function fixCanonicalIds(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixCanonicalIds(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data, content: body } = matter(content);
        
        // Determine level from directory
        const dirParts = dir.split(path.sep);
        const levelDir = dirParts[dirParts.length - 1];
        const level = levelMap[levelDir] || data.level || 'beginner';
        
        // Create unique canonical_id
        const number = String(data.number || 0).padStart(2, '0');
        const newCanonicalId = `android-${level}-${number}`;
        
        if (data.canonical_id !== newCanonicalId) {
          console.log(`Updating ${entry.name}: ${data.canonical_id} → ${newCanonicalId}`);
          
          data.canonical_id = newCanonicalId;
          
          // Regenerate frontmatter
          const frontmatter = `---
number: ${data.number}
title: "${data.title.replace(/"/g, '\\"')}"
slug: "${data.slug}"
level: "${data.level}"
tags: [${Array.isArray(data.tags) ? data.tags.map(t => `"${t}"`).join(', ') : ''}]
prerequisites: [${Array.isArray(data.prerequisites) ? data.prerequisites.map(p => typeof p === 'string' ? `"${p}"` : p).join(', ') : ''}]
estimated_minutes: ${data.estimated_minutes || 30}
contributors: [${Array.isArray(data.contributors) ? data.contributors.map(c => `"${c}"`).join(', ') : ''}]
${data.diagrams ? `diagrams: [${Array.isArray(data.diagrams) ? data.diagrams.map(d => `"${d}"`).join(', ') : ''}]` : ''}
${data.examples ? `examples: [${Array.isArray(data.examples) ? data.examples.map(e => `"${e}"`).join(', ') : ''}]` : ''}
canonical_id: "${data.canonical_id}"
---

${body}`;
          
          fs.writeFileSync(fullPath, frontmatter, 'utf-8');
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

console.log('Fixing canonical_ids...\n');
fixCanonicalIds('./android');
console.log('\n✅ Done!');


