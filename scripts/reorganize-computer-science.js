#!/usr/bin/env node

/**
 * Reorganize computer_science files from:
 *   computer_science/01_beginners/databases/ -> computer_science/databases/01_beginners/
 *   computer_science/02_intermediate/databases/ -> computer_science/databases/02_intermediate/
 *   computer_science/03_advanced/databases/ -> computer_science/databases/03_advanced/
 * 
 * This reorganizes to topic-first structure instead of level-first structure.
 */

const fs = require('fs');
const path = require('path');

const computerSciencePath = path.join(__dirname, '..', 'computer_science');

// Level folders to process
const levelFolders = ['01_beginners', '02_intermediate', '03_advanced'];

// Track all topics found across all levels
const topics = new Set();

// First pass: collect all topics
console.log('Step 1: Collecting all topics...\n');
levelFolders.forEach(levelFolder => {
  const levelPath = path.join(computerSciencePath, levelFolder);
  if (!fs.existsSync(levelPath)) {
    console.log(`⚠️  Level folder not found: ${levelPath}`);
    return;
  }
  
  const entries = fs.readdirSync(levelPath, { withFileTypes: true });
  entries.forEach(entry => {
    if (entry.isDirectory() && entry.name !== 'additional_topics') {
      topics.add(entry.name);
    }
  });
});

console.log(`Found ${topics.size} topics: ${Array.from(topics).join(', ')}\n`);

// Second pass: create topic folders and move files
console.log('Step 2: Reorganizing files...\n');

let filesMoved = 0;
let errors = 0;

topics.forEach(topic => {
  console.log(`Processing topic: ${topic}`);
  
  levelFolders.forEach(levelFolder => {
    const sourcePath = path.join(computerSciencePath, levelFolder, topic);
    const targetPath = path.join(computerSciencePath, topic, levelFolder);
    
    if (!fs.existsSync(sourcePath)) {
      // Topic doesn't exist at this level, skip
      return;
    }
    
    // Create target directory
    fs.mkdirSync(targetPath, { recursive: true });
    
    // Move all files from source to target
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
    entries.forEach(entry => {
      const sourceFile = path.join(sourcePath, entry.name);
      const targetFile = path.join(targetPath, entry.name);
      
      try {
        if (entry.isFile()) {
          fs.renameSync(sourceFile, targetFile);
          filesMoved++;
          if (filesMoved % 10 === 0) {
            process.stdout.write('.');
          }
        } else if (entry.isDirectory()) {
          // Handle nested directories (move recursively)
          const targetDir = path.join(targetPath, entry.name);
          fs.mkdirSync(targetDir, { recursive: true });
          
          const subEntries = fs.readdirSync(sourceFile, { withFileTypes: true });
          subEntries.forEach(subEntry => {
            const subSource = path.join(sourceFile, subEntry.name);
            const subTarget = path.join(targetDir, subEntry.name);
            fs.renameSync(subSource, subTarget);
            filesMoved++;
          });
        }
      } catch (error) {
        errors++;
        console.error(`\n❌ Error moving ${sourceFile}:`, error.message);
      }
    });
    
    // Remove empty source directory
    try {
      const remainingEntries = fs.readdirSync(sourcePath);
      if (remainingEntries.length === 0) {
        fs.rmdirSync(sourcePath);
      }
    } catch (error) {
      // Directory might not be empty or might have been removed already
    }
  });
  
  console.log(`  ✅ ${topic}`);
});

// Handle additional_topics separately
console.log('\nStep 3: Handling additional_topics...\n');

levelFolders.forEach(levelFolder => {
  const additionalTopicsPath = path.join(computerSciencePath, levelFolder, 'additional_topics');
  const targetPath = path.join(computerSciencePath, 'additional_topics', levelFolder);
  
  if (fs.existsSync(additionalTopicsPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    
    const entries = fs.readdirSync(additionalTopicsPath, { withFileTypes: true });
    entries.forEach(entry => {
      const sourceFile = path.join(additionalTopicsPath, entry.name);
      const targetFile = path.join(targetPath, entry.name);
      
      try {
        fs.renameSync(sourceFile, targetFile);
        filesMoved++;
      } catch (error) {
        errors++;
        console.error(`\n❌ Error moving ${sourceFile}:`, error.message);
      }
    });
    
    // Remove empty source directory
    try {
      const remainingEntries = fs.readdirSync(additionalTopicsPath);
      if (remainingEntries.length === 0) {
        fs.rmdirSync(additionalTopicsPath);
      }
    } catch (error) {
      // Directory might not be empty or might have been removed already
    }
  }
});

// Clean up empty level directories
console.log('\nStep 4: Cleaning up empty directories...\n');

levelFolders.forEach(levelFolder => {
  const levelPath = path.join(computerSciencePath, levelFolder);
  if (fs.existsSync(levelPath)) {
    try {
      const entries = fs.readdirSync(levelPath);
      if (entries.length === 0) {
        fs.rmdirSync(levelPath);
        console.log(`  ✅ Removed empty ${levelFolder} directory`);
      } else {
        console.log(`  ⚠️  ${levelFolder} still has entries: ${entries.join(', ')}`);
      }
    } catch (error) {
      console.error(`  ❌ Error checking ${levelFolder}:`, error.message);
    }
  }
});

console.log(`\n\n✅ Reorganization complete!`);
console.log(`   Files moved: ${filesMoved}`);
if (errors > 0) {
  console.log(`   Errors: ${errors}`);
}

