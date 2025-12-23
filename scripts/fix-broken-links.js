const fs = require('fs');
const path = require('path');

// Find all markdown files
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract title from filename (remove number prefix)
function extractTitle(filename) {
  const decoded = decodeURIComponent(filename);
  const match = decoded.match(/^(\d+)\.\s*(.+?)(\.md)?$/);
  return match ? match[2].trim() : decoded.replace(/\.md$/, '').trim();
}

// Build a map of files by their title (for quick lookup)
function buildFileMap(markdownFiles) {
  const fileMap = new Map();
  
  markdownFiles.forEach(file => {
    const basename = path.basename(file);
    const dirname = path.dirname(file);
    const title = extractTitle(basename);
    const key = title.toLowerCase();
    
    if (!fileMap.has(key)) {
      fileMap.set(key, []);
    }
    fileMap.get(key).push({
      file: file,
      basename: basename,
      dirname: dirname,
      title: title
    });
  });
  
  return fileMap;
}

// Find the correct file for a broken link
function findCorrectFile(linkPath, fromFile, fileMap) {
  const fromDir = path.dirname(fromFile);
  
  // Decode the link path
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(linkPath);
  } catch (e) {
    decodedPath = linkPath;
  }
  
  // Extract the expected filename
  const expectedFilename = path.basename(decodedPath);
  const expectedTitle = extractTitle(expectedFilename);
  const expectedTitleKey = expectedTitle.toLowerCase();
  
  // Try to find file with matching title
  if (fileMap.has(expectedTitleKey)) {
    const candidates = fileMap.get(expectedTitleKey);
    
    // If multiple candidates, try to find one in the same directory structure
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // Try to find one in a similar directory
    const fromDirParts = fromDir.split(path.sep);
    for (const candidate of candidates) {
      const candidateDirParts = candidate.dirname.split(path.sep);
      // Check if they're in the same knowledgebase
      const fromKb = fromDirParts.find(p => ['android', 'backend', 'devops', 'golang', 'kotlin', 'computer_science'].includes(p));
      const candidateKb = candidateDirParts.find(p => ['android', 'backend', 'devops', 'golang', 'kotlin', 'computer_science'].includes(p));
      
      if (fromKb && candidateKb && fromKb === candidateKb) {
        return candidate;
      }
    }
    
    // Return first candidate if no better match
    return candidates[0];
  }
  
  // Try partial matching
  for (const [key, files] of fileMap.entries()) {
    if (key.includes(expectedTitleKey) || expectedTitleKey.includes(key)) {
      // Prefer files in the same knowledgebase
      const fromDirParts = fromDir.split(path.sep);
      const fromKb = fromDirParts.find(p => ['android', 'backend', 'devops', 'golang', 'kotlin', 'computer_science'].includes(p));
      
      for (const file of files) {
        const fileDirParts = file.dirname.split(path.sep);
        const fileKb = fileDirParts.find(p => ['android', 'backend', 'devops', 'golang', 'kotlin', 'computer_science'].includes(p));
        
        if (fromKb && fileKb && fromKb === fileKb) {
          return file;
        }
      }
      
      return files[0];
    }
  }
  
  return null;
}

// Calculate relative path from one file to another
function getRelativePath(fromFile, toFile) {
  const fromDir = path.dirname(fromFile);
  const toDir = path.dirname(toFile);
  const toBasename = path.basename(toFile);
  
  let relative = path.relative(fromDir, toDir);
  if (relative === '') {
    relative = './';
  } else {
    relative = relative.split(path.sep).join('/') + '/';
    if (!relative.startsWith('.')) {
      relative = './' + relative;
    }
  }
  
  // URL encode the filename
  const encodedBasename = encodeURIComponent(toBasename);
  return relative + encodedBasename;
}

// Fix broken links in a file
function fixBrokenLinksInFile(filePath, fileMap) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Match markdown links: [text](path/to/file.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;
  const replacements = [];
  
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkPath = match[2].split('?')[0]; // Remove query params
    const fullMatch = match[0];
    
    // Resolve the path
    const fromDir = path.dirname(filePath);
    let resolvedPath;
    try {
      const decodedPath = decodeURIComponent(linkPath);
      if (decodedPath.startsWith('./') || decodedPath.startsWith('../')) {
        resolvedPath = path.resolve(fromDir, decodedPath);
      } else {
        resolvedPath = path.resolve(fromDir, decodedPath);
      }
    } catch (e) {
      resolvedPath = path.resolve(fromDir, linkPath);
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      // Try to find the correct file
      const correctFile = findCorrectFile(linkPath, filePath, fileMap);
      
      if (correctFile) {
        const newPath = getRelativePath(filePath, correctFile.file);
        const newLink = `[${linkText}](${newPath})`;
        replacements.push({
          old: fullMatch,
          new: newLink,
          index: match.index
        });
        modified = true;
        console.log(`  Fixed: ${linkPath} -> ${newPath}`);
      } else {
        console.log(`  Could not find replacement for: ${linkPath}`);
      }
    }
  }
  
  // Apply replacements in reverse order to maintain indices
  replacements.sort((a, b) => b.index - a.index);
  replacements.forEach(replacement => {
    const before = content.substring(0, replacement.index);
    const after = content.substring(replacement.index + replacement.old.length);
    content = before + replacement.new + after;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

// Main function
function main() {
  const projectRoot = process.cwd();
  const markdownFiles = findMarkdownFiles(projectRoot);
  const fileMap = buildFileMap(markdownFiles);
  
  console.log(`Found ${markdownFiles.length} markdown files`);
  console.log(`Fixing broken links...\n`);
  
  let fixedCount = 0;
  markdownFiles.forEach(file => {
    try {
      if (fixBrokenLinksInFile(file, fileMap)) {
        fixedCount++;
        console.log(`Fixed links in: ${file}`);
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  });
  
  console.log(`\nFixed links in ${fixedCount} files`);
}

main();

