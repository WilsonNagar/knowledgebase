#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Logical order for intermediate files
const intermediateOrder = [
  'Jetpack Compose State Management',
  'Jetpack Compose UI Components & Theming',
  'Navigation & Deep Links',
  'ViewBinding & DataBinding',
  'Testing Compose UIs',
  'Networking & API Integration',
  'Bluetooth & BLE Communication',
  'Socket Connections & Network Communication',
  'WiFi & Network Management',
  'Paging Library',
  'Image Loading & Caching',
  'File & Storage Management',
  'WorkManager & Background Tasks',
  'Android Services - Complete Guide',
  'AlarmManager & Scheduled Tasks',
  'Broadcast Receivers',
  'Content Providers',
  'App Widgets',
  'Threads & Processes in Android',
  'Android Permissions',
  'Security & Authentication',
  'Notifications & FCM',
  'Firebase Integration',
  'Dependency Injection with Hilt',
  'Kotlin Flow - Complete Guide',
  'RxJava - Complete Guide',
  'Google Maps Integration',
  'Unit Testing in Android',
  'Accessibility in Android',
  'Object Lifecycle & References in Java',
  'Advanced GC & Tuning',
];

function fixLevel(levelDir, order, levelNum) {
  if (!fs.existsSync(levelDir)) return;
  
  const files = fs.readdirSync(levelDir)
    .filter(f => f.endsWith('.md'))
    .map(name => {
      const filePath = path.join(levelDir, name);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(content);
      return { name, filePath, data };
    });
  
  console.log(`\n📁 Processing ${path.basename(levelDir)}...`);
  
  let newNumber = 1;
  const processed = new Set();
  
  // Process files in order
  for (const title of order) {
    const file = files.find(f => 
      f.data.title === title && !processed.has(f.name)
    );
    
    if (file) {
      if (file.data.number !== newNumber) {
        updateFile(file, newNumber, levelNum);
        console.log(`   ${file.data.number} → ${newNumber}: ${title}`);
      }
      processed.add(file.name);
      newNumber++;
    }
  }
  
  // Handle any remaining files
  for (const file of files) {
    if (!processed.has(file.name)) {
      updateFile(file, newNumber, levelNum);
      console.log(`   ${file.data.number} → ${newNumber}: ${file.data.title} (unlisted)`);
      newNumber++;
    }
  }
}

function updateFile(file, newNumber, levelNum) {
  const content = fs.readFileSync(file.filePath, 'utf-8');
  const { data, content: body } = matter(content);
  
  data.number = newNumber;
  data.canonical_id = `android-${String(newNumber).padStart(2, '0')}`;
  
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
  
  fs.writeFileSync(file.filePath, frontmatter, 'utf-8');
  
  const newName = `${String(newNumber).padStart(2, '0')}. ${data.title}.md`;
  const newPath = path.join(path.dirname(file.filePath), newName);
  
  if (file.filePath !== newPath) {
    fs.renameSync(file.filePath, newPath);
  }
}

const baseDir = path.join(__dirname, '..', 'android');

fixLevel(
  path.join(baseDir, '02_intermediate'),
  intermediateOrder,
  2
);

console.log('\n✅ Numbering fixed!');

