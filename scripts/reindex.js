#!/usr/bin/env node

/**
 * Reindex the knowledge base files
 * This script directly indexes files without needing the dev server
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'knowledgebase.db');
const db = new Database(dbPath);

// Initialize database tables
function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_id TEXT UNIQUE NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      level TEXT NOT NULL,
      number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      knowledgebase TEXT NOT NULL,
      tags TEXT,
      prerequisites TEXT,
      estimated_minutes INTEGER DEFAULT 0,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_canonical_id ON knowledge_files(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_slug ON knowledge_files(slug);
    CREATE INDEX IF NOT EXISTS idx_level ON knowledge_files(level);
    CREATE INDEX IF NOT EXISTS idx_knowledgebase ON knowledge_files(knowledgebase);
    
    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_files_fts USING fts5(
      title,
      content,
      tags,
      content_rowid=id
    );
  `);
}

function indexFiles(knowledgebasePath = './android') {
  const knowledgebase = knowledgebasePath.split('/').pop() || 'android';
  
  console.log(`Indexing: ${knowledgebasePath}`);
  console.log(`Knowledge base: ${knowledgebase}\n`);
  
  let indexed = 0;
  let errors = 0;
  
  // Normalize level names (e.g., "beginners" -> "beginner")
  function normalizeLevel(level) {
    if (!level) return 'beginner';
    const normalized = level.toLowerCase();
    if (normalized === 'beginners' || normalized === 'fundamentals') return 'beginner';
    if (normalized === 'intermediates') return 'intermediate';
    if (normalized === 'advanceds') return 'advanced';
    if (normalized === 'overachievers') return 'overachiever';
    return normalized;
  }

  function scanDirectory(dir, level) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const extractedLevel = entry.name.match(/^\d+_(.+)$/)?.[1];
        const newLevel = extractedLevel ? normalizeLevel(extractedLevel) : level;
        scanDirectory(fullPath, newLevel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const { data, content: body } = matter(content);
          
          const file = {
            canonical_id: data.canonical_id || `unknown-${Date.now()}`,
            slug: data.slug || entry.name.replace('.md', ''),
            title: data.title || entry.name,
            level: normalizeLevel(data.level || level),
            number: data.number || 0,
            file_path: fullPath,
            knowledgebase,
            tags: Array.isArray(data.tags) ? data.tags.join(',') : '',
            prerequisites: Array.isArray(data.prerequisites) 
              ? data.prerequisites.join(',') 
              : '',
            estimated_minutes: data.estimated_minutes || 0,
            content: body,
          };
          
          // Insert or update
          db.prepare(`
            INSERT INTO knowledge_files (
              canonical_id, slug, title, level, number, file_path,
              knowledgebase, tags, prerequisites, estimated_minutes, content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(canonical_id) DO UPDATE SET
              slug = excluded.slug,
              title = excluded.title,
              level = excluded.level,
              number = excluded.number,
              file_path = excluded.file_path,
              tags = excluded.tags,
              prerequisites = excluded.prerequisites,
              estimated_minutes = excluded.estimated_minutes,
              content = excluded.content,
              updated_at = CURRENT_TIMESTAMP
          `).run(
            file.canonical_id,
            file.slug,
            file.title,
            file.level,
            file.number,
            file.file_path,
            file.knowledgebase,
            file.tags,
            file.prerequisites,
            file.estimated_minutes,
            file.content
          );
          
          // Update FTS
          const rowId = db.prepare('SELECT id FROM knowledge_files WHERE canonical_id = ?')
            .get(file.canonical_id);
          
          if (rowId) {
            // Delete old FTS entry if exists
            db.prepare('DELETE FROM knowledge_files_fts WHERE rowid = ?').run(rowId.id);
            
            // Insert new FTS entry
            db.prepare(`
              INSERT INTO knowledge_files_fts(rowid, title, content, tags)
              VALUES (?, ?, ?, ?)
            `).run(rowId.id, file.title, file.content, file.tags);
          }
          
          indexed++;
          if (indexed % 10 === 0) {
            process.stdout.write('.');
          }
        } catch (error) {
          errors++;
          console.error(`\nError indexing ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  scanDirectory(knowledgebasePath);
  
  console.log(`\n\n✅ Indexing complete!`);
  console.log(`   Indexed: ${indexed} files`);
  if (errors > 0) {
    console.log(`   Errors: ${errors}`);
  }
}

// Main
console.log('Initializing database...');
initializeDb();
console.log('✅ Database initialized\n');

const knowledgebasePath = process.argv[2] || './android';

if (!fs.existsSync(knowledgebasePath)) {
  console.error(`Error: Directory not found: ${knowledgebasePath}`);
  process.exit(1);
}

indexFiles(knowledgebasePath);
db.close();

