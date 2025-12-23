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

// Extract all markdown links from a file
function extractLinks(content, filePath) {
  const links = [];
  // Match markdown links: [text](path/to/file.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkPath = match[2].split('?')[0]; // Remove query params
    links.push({
      text: linkText,
      path: linkPath,
      line: content.substring(0, match.index).split('\n').length,
      fullMatch: match[0]
    });
  }
  
  return links;
}

// Resolve relative path to absolute path
function resolvePath(linkPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  
  // Handle URL-encoded paths
  const decodedPath = decodeURIComponent(linkPath);
  
  // Resolve relative path
  if (decodedPath.startsWith('./') || decodedPath.startsWith('../')) {
    return path.resolve(fromDir, decodedPath);
  } else if (decodedPath.startsWith('/')) {
    // Absolute path from project root
    return path.resolve(process.cwd(), decodedPath.substring(1));
  } else {
    // Relative to current file's directory
    return path.resolve(fromDir, decodedPath);
  }
}

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

// Main function
function checkBrokenLinks() {
  const projectRoot = process.cwd();
  const markdownFiles = findMarkdownFiles(projectRoot);
  const brokenLinks = [];
  const allFiles = new Set();
  
  // Build a map of all existing files (normalized)
  markdownFiles.forEach(file => {
    const normalized = path.normalize(file).toLowerCase();
    allFiles.add(normalized);
    // Also add with different number prefixes for matching
    const basename = path.basename(file);
    const dirname = path.dirname(file);
    // Try to extract number prefix
    const numberMatch = basename.match(/^(\d+)\.\s*(.+)$/);
    if (numberMatch) {
      const title = numberMatch[2];
      allFiles.add(path.join(dirname, title).toLowerCase());
    }
  });
  
  // Check each markdown file for broken links
  markdownFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const links = extractLinks(content, file);
      
      links.forEach(link => {
        const resolvedPath = resolvePath(link.path, file);
        const normalizedResolved = path.normalize(resolvedPath).toLowerCase();
        
        // Check if file exists
        if (!fileExists(resolvedPath)) {
          // Try to find similar file
          const linkBasename = path.basename(link.path);
          const decodedBasename = decodeURIComponent(linkBasename);
          const titleMatch = decodedBasename.match(/^(\d+)\.\s*(.+)$/);
          const title = titleMatch ? titleMatch[2] : decodedBasename.replace(/\.md$/, '');
          
          // Search for files with similar title
          let foundFile = null;
          for (const existingFile of allFiles) {
            const existingBasename = path.basename(existingFile);
            if (existingBasename.toLowerCase().includes(title.toLowerCase()) ||
                title.toLowerCase().includes(existingBasename.replace(/\.md$/, '').toLowerCase())) {
              foundFile = existingFile;
              break;
            }
          }
          
          brokenLinks.push({
            file: file,
            line: link.line,
            linkText: link.text,
            linkPath: link.path,
            resolvedPath: resolvedPath,
            foundFile: foundFile,
            fullMatch: link.fullMatch
          });
        }
      });
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  });
  
  return brokenLinks;
}

// Run the check
const brokenLinks = checkBrokenLinks();

console.log(`Found ${brokenLinks.length} broken links:\n`);

// Group by file
const byFile = {};
brokenLinks.forEach(link => {
  if (!byFile[link.file]) {
    byFile[link.file] = [];
  }
  byFile[link.file].push(link);
});

// Print results
Object.keys(byFile).forEach(file => {
  console.log(`\n${file}:`);
  byFile[file].forEach(link => {
    console.log(`  Line ${link.line}: ${link.fullMatch}`);
    console.log(`    Expected: ${link.resolvedPath}`);
    if (link.foundFile) {
      console.log(`    Found similar: ${link.foundFile}`);
    }
  });
});

// Export for use in fix script
if (require.main === module) {
  // Save to JSON for fix script
  fs.writeFileSync(
    path.join(process.cwd(), 'broken-links.json'),
    JSON.stringify(brokenLinks, null, 2)
  );
  console.log('\n\nBroken links saved to broken-links.json');
}

module.exports = { checkBrokenLinks };

