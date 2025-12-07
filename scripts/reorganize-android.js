#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Reorganize Android files into logical groups with sequential numbering
 */

// Define logical grouping for each level
const reorganization = {
  beginners: [
    // Keep as is - already well organized
    '01. Introduction to Android Architecture.md',
    '02. SOLID Principles.md',
    '03. Kotlin Coroutines Basics.md',
    '04. Room Database & Data Persistence.md',
    '05. Android Lifecycle Components.md',
    '06. JVM Architecture & Java Memory Model.md',
    '07. Java Threads & Concurrency Basics.md',
    '08. Garbage Collection Fundamentals.md',
  ],
  
  intermediate: [
    // UI & Compose (1-5)
    '10. Jetpack Compose State Management.md',
    '26. Jetpack Compose UI Components & Theming.md',
    '11. Navigation & Deep Links.md',
    '33. ViewBinding & DataBinding.md',
    '12. Testing Compose UIs.md',
    
    // Networking (6-9)
    '25. Networking & API Integration.md',
    '16. Bluetooth & BLE Communication.md',
    '17. Socket Connections & Network Communication.md',
    '18. WiFi & Network Management.md',
    
    // Data & Storage (10-12)
    '30. Paging Library.md',
    '32. Image Loading & Caching.md',
    '39. File & Storage Management.md',
    
    // Background & Services (13-16)
    '13. WorkManager & Background Tasks.md',
    '35. Android Services - Complete Guide.md',
    '36. AlarmManager & Scheduled Tasks.md',
    '37. Broadcast Receivers.md',
    
    // System Components (17-19)
    '38. Content Providers.md',
    '41. App Widgets.md',
    '40. Threads & Processes in Android.md',
    
    // Security & Permissions (20-21)
    '27. Android Permissions.md',
    '28. Security & Authentication.md',
    
    // Notifications & Firebase (22-23)
    '29. Notifications & FCM.md',
    '31. Firebase Integration.md',
    
    // Architecture & Libraries (24-26)
    '24. Dependency Injection with Hilt.md',
    '22. Kotlin Flow - Complete Guide.md',
    '23. RxJava - Complete Guide.md',
    
    // Maps & Location (27)
    '15. Google Maps Integration.md',
    
    // Testing & Quality (27-28)
    '14. Unit Testing in Android.md',
    '34. Accessibility in Android.md',
    
    // Memory & Performance (29-30)
    '19. Object Lifecycle & References in Java.md',
    '20. Advanced GC & Tuning.md',
  ],
  
  advanced: [
    // Performance & Profiling (1-3)
    '25. Android Studio Profiler - Complete Mastery Guide.md',
    '26. System Tracing - Complete Guide.md',
    '21. Performance Profiling & Memory Leaks.md',
    
    // Architecture & Patterns (4-5)
    '22. Building Offline-First Apps.md',
    '20. Advanced Coroutines & Cancellation.md',
    
    // OS Internals (6-11)
    '29. Android OS Internals - Architecture & Process Management.md',
    '30. Android OS Internals - IPC & Binder.md',
    '31. Android OS Internals - System Services.md',
    '32. Android OS Internals - Rendering Pipeline.md',
    '33. Android OS Internals - Power Management.md',
    '34. Android OS Internals - Dex Loading & Optimization.md',
    '35. Android OS Internals - Looper, Handler & MessageQueue.md',
    
    // Specialized Topics (12-16)
    '23. NoSQL Databases in Android.md',
    '24. ARCore & Augmented Reality.md',
    '27. Perfecto - Complete Testing Platform Guide.md',
    '28. Android GC & Memory Management.md',
  ],
  
  overachiever: [
    '01. Designing Custom Renderers.md',
    '02. Build Systems & Advanced Gradle.md',
    '03. Large Scale App Architecture Case Study.md',
    '04. Automotive Infotainment Development.md',
  ],
};

function getCurrentFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const filePath = path.join(dir, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);
        files.push({
          name: entry.name,
          path: filePath,
          data,
        });
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }
  }
  return files;
}

function findFileByName(files, targetName) {
  return files.find(f => f.name === targetName);
}

function updateFileNumber(filePath, newNumber, level) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  
  const oldNumber = data.number;
  data.number = newNumber;
  
  // Update canonical_id
  const knowledgebase = 'android';
  data.canonical_id = `${knowledgebase}-${String(newNumber).padStart(2, '0')}`;
  
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
  
  fs.writeFileSync(filePath, frontmatter, 'utf-8');
  
  // Rename file
  const dir = path.dirname(filePath);
  const newName = `${String(newNumber).padStart(2, '0')}. ${data.title}.md`;
  const newPath = path.join(dir, newName);
  
  if (filePath !== newPath) {
    fs.renameSync(filePath, newPath);
    return { oldPath: filePath, newPath, oldNumber, newNumber };
  }
  
  return null;
}

function reorganizeLevel(level, order) {
  const levelDir = path.join(__dirname, '..', 'android', `0${level}_${getLevelName(level)}`);
  const currentFiles = getCurrentFiles(levelDir);
  
  console.log(`\n📁 Processing ${getLevelName(level)} level...`);
  console.log(`   Found ${currentFiles.length} files`);
  
  const renames = [];
  let newNumber = 1;
  
  for (const targetName of order) {
    const file = findFileByName(currentFiles, targetName);
    if (file) {
      const rename = updateFileNumber(file.path, newNumber, level);
      if (rename) {
        renames.push(rename);
        console.log(`   ${rename.oldNumber} → ${rename.newNumber}: ${file.data.title}`);
      } else if (file.data.number !== newNumber) {
        updateFileNumber(file.path, newNumber, level);
        console.log(`   ${file.data.number} → ${newNumber}: ${file.data.title} (number updated)`);
      }
      newNumber++;
    } else {
      console.warn(`   ⚠️  File not found: ${targetName}`);
    }
  }
  
  // Check for files not in the reorganization list
  const processedNames = new Set(order);
  const unprocessed = currentFiles.filter(f => !processedNames.has(f.name));
  
  if (unprocessed.length > 0) {
    console.log(`\n   ⚠️  ${unprocessed.length} files not in reorganization list:`);
    for (const file of unprocessed) {
      console.log(`      - ${file.name}`);
    }
  }
  
  return renames;
}

function getLevelName(level) {
  const names = {
    1: 'beginners',
    2: 'intermediate',
    3: 'advanced',
    4: 'overachiever',
  };
  return names[level] || 'unknown';
}

function main() {
  console.log('🔄 Reorganizing Android knowledge base files...\n');
  
  const allRenames = [];
  
  // Process each level
  allRenames.push(...reorganizeLevel(1, reorganization.beginners));
  allRenames.push(...reorganizeLevel(2, reorganization.intermediate));
  allRenames.push(...reorganizeLevel(3, reorganization.advanced));
  allRenames.push(...reorganizeLevel(4, reorganization.overachiever));
  
  console.log('\n✅ Reorganization complete!');
  console.log(`\n📊 Summary: ${allRenames.length} files renamed`);
  console.log('\n⚠️  Next steps:');
  console.log('   1. Review the changes');
  console.log('   2. Update prerequisites in affected files if needed');
  console.log('   3. Reindex the database: npm run setup-db');
  console.log('   4. Test the application');
  console.log('   5. Commit the changes');
}

main();

