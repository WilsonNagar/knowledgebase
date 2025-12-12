import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { KnowledgeFile, KnowledgeBaseMetadata } from '@/types';

const dbPath = process.env.DB_PATH || './data/knowledgebase.db';
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = require('path').dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    initializeDb();
  }
  return db;
}

function initializeDb() {
  if (!db) return;
  
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
      estimated_minutes INTEGER,
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
    
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_id TEXT UNIQUE NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      level TEXT NOT NULL,
      topic TEXT NOT NULL,
      requirements TEXT NOT NULL,
      topics_covered TEXT,
      estimated_hours INTEGER,
      steps TEXT NOT NULL,
      prerequisites TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_project_canonical_id ON projects(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_project_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_project_level ON projects(level);
    CREATE INDEX IF NOT EXISTS idx_project_topic ON projects(topic);
  `);
}

export function indexFiles(knowledgebasePath: string = './android') {
  const db = getDb();
  const knowledgebase = knowledgebasePath.split('/').pop() || 'android';
  
  // Normalize level names (e.g., "beginners" -> "beginner")
  function normalizeLevel(level?: string): string {
    if (!level) return 'beginner';
    const normalized = level.toLowerCase();
    if (normalized === 'beginners' || normalized === 'fundamentals') return 'beginner';
    if (normalized === 'intermediates') return 'intermediate';
    if (normalized === 'advanceds') return 'advanced';
    if (normalized === 'overachievers') return 'overachiever';
    return normalized;
  }

  function scanDirectory(dir: string, level?: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const extractedLevel = entry.name.match(/^\d+_(.+)$/)?.[1];
        const newLevel = extractedLevel ? normalizeLevel(extractedLevel) : level;
        scanDirectory(fullPath, newLevel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const { data, content: body } = matter(content);
          
          const file: KnowledgeFile = {
            canonical_id: data.canonical_id || `unknown-${Date.now()}`,
            slug: data.slug || entry.name.replace('.md', ''),
            title: data.title || entry.name,
            level: normalizeLevel(data.level || level) as 'beginner' | 'intermediate' | 'advanced' | 'overachiever',
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
            .get(file.canonical_id) as { id: number };
          
          db.prepare(`
            INSERT INTO knowledge_files_fts(rowid, title, content, tags)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(rowid) DO UPDATE SET
              title = excluded.title,
              content = excluded.content,
              tags = excluded.tags
          `).run(rowId.id, file.title, file.content, file.tags);
          
        } catch (error) {
          console.error(`Error indexing ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(knowledgebasePath);
}

export function getFiles(filters?: {
  level?: string;
  knowledgebase?: string;
  tags?: string[];
  topic?: string;
}): KnowledgeFile[] {
  const db = getDb();
  let query = 'SELECT * FROM knowledge_files WHERE 1=1';
  const params: any[] = [];
  
  if (filters?.level) {
    query += ' AND level = ?';
    params.push(filters.level);
  }
  
  if (filters?.knowledgebase) {
    query += ' AND knowledgebase = ?';
    params.push(filters.knowledgebase);
  }
  
  if (filters?.topic) {
    // Filter by topic: file_path should contain /topic/ (e.g., /databases/)
    query += ' AND file_path LIKE ?';
    params.push(`%/${filters.topic}/%`);
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    query += ' AND (';
    query += filters.tags.map(() => 'tags LIKE ?').join(' OR ');
    query += ')';
    filters.tags.forEach(tag => params.push(`%${tag}%`));
  }
  
  query += ' ORDER BY number ASC';
  
  return db.prepare(query).all(...params) as KnowledgeFile[];
}

export function getFileBySlug(slug: string, knowledgebase?: string): KnowledgeFile | null {
  const db = getDb();
  let query = 'SELECT * FROM knowledge_files WHERE slug = ?';
  const params: any[] = [slug];
  
  if (knowledgebase) {
    query += ' AND knowledgebase = ?';
    params.push(knowledgebase);
  }
  
  return db.prepare(query).get(...params) as KnowledgeFile | null;
}

export function getFileById(id: number): KnowledgeFile | null {
  const db = getDb();
  return db.prepare('SELECT * FROM knowledge_files WHERE id = ?').get(id) as KnowledgeFile | null;
}

export function searchFiles(query: string, filters?: {
  level?: string;
  knowledgebase?: string;
  topic?: string;
}): KnowledgeFile[] {
  const db = getDb();
  
  let ftsQuery = `
    SELECT kf.* FROM knowledge_files kf
    JOIN knowledge_files_fts fts ON kf.id = fts.rowid
    WHERE knowledge_files_fts MATCH ?
  `;
  const params: any[] = [query];
  
  if (filters?.level) {
    ftsQuery += ' AND kf.level = ?';
    params.push(filters.level);
  }
  
  if (filters?.knowledgebase) {
    ftsQuery += ' AND kf.knowledgebase = ?';
    params.push(filters.knowledgebase);
  }
  
  if (filters?.topic) {
    ftsQuery += ' AND kf.file_path LIKE ?';
    params.push(`%/${filters.topic}/%`);
  }
  
  ftsQuery += ' ORDER BY kf.number ASC';
  
  return db.prepare(ftsQuery).all(...params) as KnowledgeFile[];
}

export function indexProjects(projectsPath: string = './projects') {
  const db = getDb();
  const { readFileSync, readdirSync } = require('fs');
  const { join } = require('path');
  const matter = require('gray-matter');
  
  function normalizeLevel(level?: string): string {
    if (!level) return 'beginner';
    const normalized = level.toLowerCase();
    if (normalized === 'beginners' || normalized === 'fundamentals') return 'beginner';
    if (normalized === 'intermediates') return 'intermediate';
    if (normalized === 'advanceds') return 'advanced';
    if (normalized === 'overachievers') return 'overachiever';
    return normalized;
  }
  
  function extractSteps(content: string): any[] {
    const steps: any[] = [];
    const challengeSections = content.split(/^## Challenge \d+:/gm);
    
    challengeSections.forEach((section, index) => {
      if (index === 0) return;
      
      const challengeMatch = section.match(/^(.+?) \((.+?)\)$/m);
      if (!challengeMatch) return;
      
      const title = challengeMatch[1].trim();
      const difficulty = challengeMatch[2].trim().toLowerCase();
      
      // Extract step descriptions
      const stepMatches = [...section.matchAll(/^### Step \d+\.\d+: (.+)$/gm)];
      const stepsInChallenge = stepMatches.map((m, i) => {
        const stepIndex = m.index || 0;
        const afterStep = section.substring(stepIndex);
        const nextStepMatch = afterStep.match(/\n### Step \d+\.\d+:/);
        const endIndex = nextStepMatch ? nextStepMatch.index : afterStep.length;
        let description = afterStep.substring(0, endIndex);
        description = description.replace(/```[\s\S]*?```/g, '');
        description = description.replace(/### Hints[\s\S]*?###/g, '');
        description = description.replace(/### Guide References[\s\S]*?###/g, '');
        const lines = description.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        
        // Extract guide references
        const refMatch = section.match(/### Guide References[\s\S]*?###/);
        const guideRefs: string[] = [];
        if (refMatch) {
          const refSection = refMatch[0];
          const linkMatches = [...refSection.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
          linkMatches.forEach(linkMatch => {
            const slug = linkMatch[2].match(/\/([^/]+)\.md/)?.[1];
            if (slug) guideRefs.push(slug);
          });
        }
        
        // Extract hints
        const hintsMatch = section.match(/### Hints[\s\S]*?(?=###|$)/);
        const hints: string[] = [];
        if (hintsMatch) {
          const hintsSection = hintsMatch[0];
          const listMatches = [...hintsSection.matchAll(/^[-*] (.+)$/gm)];
          listMatches.forEach(hintMatch => {
            hints.push(hintMatch[1].trim());
          });
        }
        
        // Extract code examples
        const codeMatches = [...section.matchAll(/```[\s\S]*?```/g)];
        const codeExamples = codeMatches.map(c => c[0]).join('\n\n');
        
        return {
          number: index * 100 + (i + 1),
          title: m[1].trim(),
          description: lines.slice(0, 3).join(' ').substring(0, 500),
          guide_references: guideRefs,
          code_examples: codeExamples || undefined,
          hints: hints.length > 0 ? hints : undefined,
        };
      });
      
      steps.push({
        challenge_number: index,
        challenge_title: title,
        difficulty: difficulty,
        steps: stepsInChallenge,
        completion_status: 'not_started',
      });
    });
    
    return steps;
  }
  
  function extractRequirements(content: string): string {
    const reqMatch = content.match(/### Project Requirements[\s\S]*?(?=##|$)/);
    return reqMatch ? reqMatch[0] : content.substring(0, 1000);
  }
  
  function scanDirectory(dir: string, level?: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const extractedLevel = entry.name.match(/^\d+_(.+)$/)?.[1];
        const newLevel = extractedLevel ? normalizeLevel(extractedLevel) : level;
        scanDirectory(fullPath, newLevel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const { data, content: body } = matter(content);
          
          const steps = extractSteps(body);
          const requirements = extractRequirements(body);
          const topic = fullPath.split('/').slice(-3, -2)[0] || data.topic || 'android';
          
          const project = {
            canonical_id: data.canonical_id || `project-${Date.now()}-${Math.random()}`,
            slug: data.slug || entry.name.replace('.md', ''),
            title: data.title || entry.name,
            description: data.description || '',
            level: normalizeLevel(data.level || level) as 'beginner' | 'intermediate' | 'advanced' | 'overachiever',
            topic: topic,
            requirements: requirements,
            topics_covered: Array.isArray(data.topics_covered) 
              ? data.topics_covered.join(',') 
              : (data.topics_covered || ''),
            estimated_hours: data.estimated_hours || 0,
            steps: JSON.stringify(steps),
            prerequisites: data.prerequisites 
              ? JSON.stringify(Array.isArray(data.prerequisites) ? data.prerequisites : [data.prerequisites])
              : null,
          };
          
          db.prepare(`
            INSERT INTO projects (
              canonical_id, slug, title, description, level, topic,
              requirements, topics_covered, estimated_hours, steps, prerequisites
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(canonical_id) DO UPDATE SET
              slug = excluded.slug,
              title = excluded.title,
              description = excluded.description,
              level = excluded.level,
              topic = excluded.topic,
              requirements = excluded.requirements,
              topics_covered = excluded.topics_covered,
              estimated_hours = excluded.estimated_hours,
              steps = excluded.steps,
              prerequisites = excluded.prerequisites,
              updated_at = CURRENT_TIMESTAMP
          `).run(
            project.canonical_id,
            project.slug,
            project.title,
            project.description,
            project.level,
            project.topic,
            project.requirements,
            project.topics_covered,
            project.estimated_hours,
            project.steps,
            project.prerequisites
          );
          
        } catch (error) {
          console.error(`Error indexing ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(projectsPath);
}

export function getKnowledgeBases(): KnowledgeBaseMetadata[] {
  const db = getDb();
  const bases = db.prepare(`
    SELECT 
      knowledgebase,
      COUNT(*) as file_count,
      COUNT(DISTINCT level) as level_count
    FROM knowledge_files
    GROUP BY knowledgebase
  `).all() as Array<{ knowledgebase: string; file_count: number; level_count: number }>;
  
  return bases.map(base => ({
    name: base.knowledgebase,
    path: `./${base.knowledgebase}`,
    fileCount: base.file_count,
    levelCount: base.level_count,
  }));
}

