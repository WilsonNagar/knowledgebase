import { Pool, QueryResult } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { KnowledgeFile, KnowledgeBaseMetadata } from '@/types';

let pool: Pool | null = null;
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.POSTGRES_USER || 'knowledgebase'}:${process.env.POSTGRES_PASSWORD || 'knowledgebase_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'knowledgebase'}`;
    
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
    });

    // Initialize database schema (fire and forget, but track the promise)
    if (!initPromise) {
      initPromise = initializeDb().catch(err => {
        console.error('Failed to initialize database:', err);
        dbInitialized = false;
      });
    }
  }
  return pool;
}

// Helper to ensure DB is initialized before queries
export async function ensureDbInitialized(): Promise<void> {
  if (!dbInitialized && initPromise) {
    await initPromise;
    dbInitialized = true;
  }
}

async function initializeDb(): Promise<void> {
  const pool = getPool();
  
  try {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_canonical_id ON knowledge_files(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_slug ON knowledge_files(slug);
    CREATE INDEX IF NOT EXISTS idx_level ON knowledge_files(level);
    CREATE INDEX IF NOT EXISTS idx_knowledgebase ON knowledge_files(knowledgebase);
    
    -- Create full-text search index using PostgreSQL's built-in full-text search
    CREATE INDEX IF NOT EXISTS idx_fts_title ON knowledge_files USING gin(to_tsvector('english', title));
    CREATE INDEX IF NOT EXISTS idx_fts_content ON knowledge_files USING gin(to_tsvector('english', content));
    CREATE INDEX IF NOT EXISTS idx_fts_tags ON knowledge_files USING gin(to_tsvector('english', COALESCE(tags, '')));
    
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_project_canonical_id ON projects(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_project_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_project_level ON projects(level);
    CREATE INDEX IF NOT EXISTS idx_project_topic ON projects(topic);
  `);
    dbInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Legacy getDb function for backward compatibility - returns pool
export function getDb(): Pool {
  return getPool();
}

export async function indexFiles(knowledgebasePath: string = './android') {
  const pool = getPool();
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

  async function scanDirectory(dir: string, level?: string): Promise<void> {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const extractedLevel = entry.name.match(/^\d+_(.+)$/)?.[1];
        const newLevel = extractedLevel ? normalizeLevel(extractedLevel) : level;
        await scanDirectory(fullPath, newLevel);
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
          await pool.query(`
            INSERT INTO knowledge_files (
              canonical_id, slug, title, level, number, file_path,
              knowledgebase, tags, prerequisites, estimated_minutes, content
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT(canonical_id) DO UPDATE SET
              slug = EXCLUDED.slug,
              title = EXCLUDED.title,
              level = EXCLUDED.level,
              number = EXCLUDED.number,
              file_path = EXCLUDED.file_path,
              tags = EXCLUDED.tags,
              prerequisites = EXCLUDED.prerequisites,
              estimated_minutes = EXCLUDED.estimated_minutes,
              content = EXCLUDED.content,
              updated_at = CURRENT_TIMESTAMP
          `, [
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
          ]);
          
        } catch (error) {
          console.error(`Error indexing ${fullPath}:`, error);
        }
      }
    }
  }
  
  await scanDirectory(knowledgebasePath);
}

export async function getFiles(filters?: {
  level?: string;
  knowledgebase?: string;
  tags?: string[];
  topic?: string;
}): Promise<KnowledgeFile[]> {
  const pool = getPool();
  let query = 'SELECT * FROM knowledge_files WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters?.level) {
    query += ` AND level = $${paramIndex}`;
    params.push(filters.level);
    paramIndex++;
  }
  
  if (filters?.knowledgebase) {
    query += ` AND knowledgebase = $${paramIndex}`;
    params.push(filters.knowledgebase);
    paramIndex++;
  }
  
  if (filters?.topic) {
    query += ` AND file_path LIKE $${paramIndex}`;
    params.push(`%/${filters.topic}/%`);
    paramIndex++;
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    query += ' AND (';
    const tagConditions = filters.tags.map(() => {
      const condition = `tags LIKE $${paramIndex}`;
      paramIndex++;
      return condition;
    });
    query += tagConditions.join(' OR ');
    query += ')';
    filters.tags.forEach(tag => params.push(`%${tag}%`));
  }
  
  query += ' ORDER BY number ASC';
  
  const result = await pool.query(query, params);
  return result.rows as KnowledgeFile[];
}

export async function getFileBySlug(slug: string, knowledgebase?: string): Promise<KnowledgeFile | null> {
  const pool = getPool();
  let query = 'SELECT * FROM knowledge_files WHERE slug = $1';
  const params: any[] = [slug];
  
  if (knowledgebase) {
    query += ' AND knowledgebase = $2';
    params.push(knowledgebase);
  }
  
  const result = await pool.query(query, params);
  return result.rows[0] as KnowledgeFile | null || null;
}

export async function getFileById(id: number): Promise<KnowledgeFile | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM knowledge_files WHERE id = $1', [id]);
  return result.rows[0] as KnowledgeFile | null || null;
}

export async function getFileByFilename(filename: string, knowledgebase?: string): Promise<{ slug: string; knowledgebase: string } | null> {
  const pool = getPool();
  
  // Remove .md extension if present
  const cleanFilename = filename.replace(/\.md$/, '');
  // Decode URL encoding
  const decodedFilename = decodeURIComponent(cleanFilename);
  
  // Try exact file_path match first
  let query = `
    SELECT slug, knowledgebase 
    FROM knowledge_files 
    WHERE file_path LIKE $1
    LIMIT 1
  `;
  const params: any[] = [`%/${decodedFilename}.md`];
  
  if (knowledgebase) {
    query = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE file_path LIKE $1 AND knowledgebase = $2
      LIMIT 1
    `;
    params.push(knowledgebase);
  }
  
  const result = await pool.query(query, params);
  if (result.rows.length > 0) {
    return result.rows[0] as { slug: string; knowledgebase: string };
  }
  
  // Strip number prefix (e.g., "20. Advanced Coroutines" -> "Advanced Coroutines")
  const filenameWithoutNumber = decodedFilename.replace(/^\d+\.\s*/, '').trim();
  
  // Try matching file_path without number prefix
  if (filenameWithoutNumber !== decodedFilename) {
    let queryWithoutNumber = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE file_path LIKE $1
      LIMIT 1
    `;
    const paramsWithoutNumber: any[] = [`%/${filenameWithoutNumber}.md`];
    
    if (knowledgebase) {
      queryWithoutNumber = `
        SELECT slug, knowledgebase 
        FROM knowledge_files 
        WHERE file_path LIKE $1 AND knowledgebase = $2
        LIMIT 1
      `;
      paramsWithoutNumber.push(knowledgebase);
    }
    
    const resultWithoutNumber = await pool.query(queryWithoutNumber, paramsWithoutNumber);
    if (resultWithoutNumber.rows.length > 0) {
      return resultWithoutNumber.rows[0] as { slug: string; knowledgebase: string };
    }
  }
  
  // Try matching by exact title (case-insensitive)
  let titleQuery = `
    SELECT slug, knowledgebase 
    FROM knowledge_files 
    WHERE LOWER(title) = LOWER($1)
    LIMIT 1
  `;
  const titleParams: any[] = [decodedFilename];
  
  if (knowledgebase) {
    titleQuery = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE LOWER(title) = LOWER($1) AND knowledgebase = $2
      LIMIT 1
    `;
    titleParams.push(knowledgebase);
  }
  
  const titleResult = await pool.query(titleQuery, titleParams);
  if (titleResult.rows.length > 0) {
    return titleResult.rows[0] as { slug: string; knowledgebase: string };
  }
  
  // Try matching by title without number prefix (case-insensitive)
  if (filenameWithoutNumber !== decodedFilename) {
    let titleQueryWithoutNumber = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE LOWER(title) = LOWER($1)
      LIMIT 1
    `;
    const titleParamsWithoutNumber: any[] = [filenameWithoutNumber];
    
    if (knowledgebase) {
      titleQueryWithoutNumber = `
        SELECT slug, knowledgebase 
        FROM knowledge_files 
        WHERE LOWER(title) = LOWER($1) AND knowledgebase = $2
        LIMIT 1
      `;
      titleParamsWithoutNumber.push(knowledgebase);
    }
    
    const titleResultWithoutNumber = await pool.query(titleQueryWithoutNumber, titleParamsWithoutNumber);
    if (titleResultWithoutNumber.rows.length > 0) {
      return titleResultWithoutNumber.rows[0] as { slug: string; knowledgebase: string };
    }
  }
  
  // Try partial title match (case-insensitive) as last resort
  // First try the full title without number
  let partialQuery = `
    SELECT slug, knowledgebase 
    FROM knowledge_files 
    WHERE LOWER(title) LIKE LOWER($1)
    LIMIT 1
  `;
  let partialParams: any[] = [`%${filenameWithoutNumber}%`];
  
  if (knowledgebase) {
    partialQuery = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE LOWER(title) LIKE LOWER($1) AND knowledgebase = $2
      LIMIT 1
    `;
    partialParams.push(knowledgebase);
  }
  
  let partialResult = await pool.query(partialQuery, partialParams);
  if (partialResult.rows.length > 0) {
    return partialResult.rows[0] as { slug: string; knowledgebase: string };
  }
  
  // Try matching with key words from the title (for multi-word titles)
  // Extract significant words (ignore common words like "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for")
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were']);
  const words = filenameWithoutNumber
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 3); // Take up to 3 most significant words
  
  if (words.length > 0) {
    // Try matching with all significant words
    const keywordPattern = words.join('%');
    partialQuery = `
      SELECT slug, knowledgebase 
      FROM knowledge_files 
      WHERE LOWER(title) LIKE LOWER($1)
      LIMIT 1
    `;
    partialParams = [`%${keywordPattern}%`];
    
    if (knowledgebase) {
      partialQuery = `
        SELECT slug, knowledgebase 
        FROM knowledge_files 
        WHERE LOWER(title) LIKE LOWER($1) AND knowledgebase = $2
        LIMIT 1
      `;
      partialParams.push(knowledgebase);
    }
    
    partialResult = await pool.query(partialQuery, partialParams);
    if (partialResult.rows.length > 0) {
      return partialResult.rows[0] as { slug: string; knowledgebase: string };
    }
    
    // Try matching with individual significant words (take the longest/most specific)
    if (words.length > 1) {
      const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
      partialQuery = `
        SELECT slug, knowledgebase 
        FROM knowledge_files 
        WHERE LOWER(title) LIKE LOWER($1)
        ORDER BY LENGTH(title) ASC
        LIMIT 1
      `;
      partialParams = [`%${longestWord}%`];
      
      if (knowledgebase) {
        partialQuery = `
          SELECT slug, knowledgebase 
          FROM knowledge_files 
          WHERE LOWER(title) LIKE LOWER($1) AND knowledgebase = $2
          ORDER BY LENGTH(title) ASC
          LIMIT 1
        `;
        partialParams.push(knowledgebase);
      }
      
      partialResult = await pool.query(partialQuery, partialParams);
      if (partialResult.rows.length > 0) {
        return partialResult.rows[0] as { slug: string; knowledgebase: string };
      }
    }
  }
  
  return null;
}

export async function searchFiles(query: string, filters?: {
  level?: string;
  knowledgebase?: string;
  topic?: string;
}): Promise<KnowledgeFile[]> {
  const pool = getPool();
  
  // Use PostgreSQL full-text search
  let ftsQuery = `
    SELECT kf.* FROM knowledge_files kf
    WHERE (
      to_tsvector('english', kf.title) @@ plainto_tsquery('english', $1)
      OR to_tsvector('english', kf.content) @@ plainto_tsquery('english', $1)
      OR to_tsvector('english', COALESCE(kf.tags, '')) @@ plainto_tsquery('english', $1)
    )
  `;
  const params: any[] = [query];
  let paramIndex = 2;
  
  if (filters?.level) {
    ftsQuery += ` AND kf.level = $${paramIndex}`;
    params.push(filters.level);
    paramIndex++;
  }
  
  if (filters?.knowledgebase) {
    ftsQuery += ` AND kf.knowledgebase = $${paramIndex}`;
    params.push(filters.knowledgebase);
    paramIndex++;
  }
  
  if (filters?.topic) {
    ftsQuery += ` AND kf.file_path LIKE $${paramIndex}`;
    params.push(`%/${filters.topic}/%`);
    paramIndex++;
  }
  
  ftsQuery += ' ORDER BY kf.number ASC';
  
  const result = await pool.query(ftsQuery, params);
  return result.rows as KnowledgeFile[];
}

export async function indexProjects(projectsPath: string = './projects') {
  const pool = getPool();
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
      
      // Extract step descriptions - handle both ### and #### formats
      const stepMatches = [...section.matchAll(/^#### Step \d+\.\d+: (.+)$/gm)];
      const stepsInChallenge = stepMatches.map((m, i) => {
        const stepIndex = m.index || 0;
        const afterStep = section.substring(stepIndex);
        const nextStepMatch = afterStep.match(/\n#### Step \d+\.\d+:/);
        const endIndex = nextStepMatch ? nextStepMatch.index : afterStep.length;
        let description = afterStep.substring(0, endIndex);
        description = description.replace(/```[\s\S]*?```/g, '');
        description = description.replace(/### Hints[\s\S]*?###/g, '');
        description = description.replace(/### Guide References[\s\S]*?###/g, '');
        const lines = description.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        
        // Extract guide references - look in the step section, not the whole challenge
        const stepSection = afterStep.substring(0, endIndex);
        const refMatch = stepSection.match(/### Guide References[\s\S]*?(?=###|$)/);
        const guideRefs: string[] = [];
        if (refMatch) {
          const refSection = refMatch[0];
          const linkMatches = [...refSection.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
          linkMatches.forEach(linkMatch => {
            const path = linkMatch[2];
            // Handle relative paths like ../android/02_intermediate/14.%20Android%20Services%20-%20Complete%20Guide.md
            // Extract filename from path
            const filenameMatch = path.match(/([^/]+)\.md$/);
            if (filenameMatch) {
              // Decode URL encoding (%20 -> space, etc.)
              let filename = decodeURIComponent(filenameMatch[1]);
              // Remove .md extension if present
              filename = filename.replace(/\.md$/, '');
              
              // Try to resolve to actual canonical_id or slug by reading the file
              // Extract knowledgebase and path from relative path
              const pathParts = path.split('/');
              const androidIndex = pathParts.findIndex(p => p === 'android' || p === 'devops' || p === 'backend');
              if (androidIndex !== -1 && pathParts.length > androidIndex + 2) {
                const knowledgebase = pathParts[androidIndex];
                const levelFolder = pathParts[androidIndex + 1];
                // Construct file path relative to project root
                const projectRoot = projectsPath.replace(/\/projects.*$/, '');
                const filePath = join(projectRoot, knowledgebase, levelFolder, filename + '.md');
                
                try {
                  const fs = require('fs');
                  if (fs.existsSync(filePath)) {
                    const fileContent = readFileSync(filePath, 'utf-8');
                    const { data } = matter(fileContent);
                    // Use canonical_id if available (preferred), otherwise use slug
                    if (data.canonical_id) {
                      guideRefs.push(data.canonical_id);
                    } else if (data.slug) {
                      guideRefs.push(data.slug);
                    } else {
                      // Fallback to filename
                      guideRefs.push(filename);
                    }
                  } else {
                    // File not found, try to look up in database by filename pattern
                    (async () => {
                      try {
                        const result = await pool.query(`
                          SELECT canonical_id, slug FROM knowledge_files 
                          WHERE knowledgebase = $1 AND file_path LIKE $2
                          LIMIT 1
                        `, [knowledgebase, `%/${filename}.md`]);
                        if (result.rows.length > 0) {
                          guideRefs.push(result.rows[0].canonical_id || result.rows[0].slug || filename);
                        } else {
                          guideRefs.push(filename);
                        }
                      } catch (error) {
                        guideRefs.push(filename);
                      }
                    })();
                  }
                } catch (error) {
                  // Error reading file, try database lookup
                  (async () => {
                    try {
                      const result = await pool.query(`
                        SELECT canonical_id, slug FROM knowledge_files 
                        WHERE knowledgebase = $1 AND file_path LIKE $2
                        LIMIT 1
                      `, [knowledgebase, `%/${filename}.md`]);
                      if (result.rows.length > 0) {
                        guideRefs.push(result.rows[0].canonical_id || result.rows[0].slug || filename);
                      } else {
                        guideRefs.push(filename);
                      }
                    } catch (dbError) {
                      guideRefs.push(filename);
                    }
                  })();
                }
              } else {
                // Can't parse path, use filename
                guideRefs.push(filename);
              }
            } else {
              // Fallback: try to extract any slug-like string
              const slugMatch = path.match(/([^/]+)\.md/);
              if (slugMatch) {
                guideRefs.push(decodeURIComponent(slugMatch[1]));
              }
            }
          });
        }
        
        // Extract hints - look in the step section
        const hintsMatch = stepSection.match(/### Hints[\s\S]*?(?=###|$)/);
        const hints: string[] = [];
        if (hintsMatch) {
          const hintsSection = hintsMatch[0];
          const listMatches = [...hintsSection.matchAll(/^[-*] (.+)$/gm)];
          listMatches.forEach(hintMatch => {
            hints.push(hintMatch[1].trim());
          });
        }
        
        // Extract code examples - look in the step section
        const codeMatches = [...stepSection.matchAll(/```[\s\S]*?```/g)];
        const codeExamples = codeMatches.length > 0 ? codeMatches.map(c => c[0]).join('\n\n') : undefined;
        
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
  
  async function scanDirectory(dir: string, level?: string): Promise<void> {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const extractedLevel = entry.name.match(/^\d+_(.+)$/)?.[1];
        const newLevel = extractedLevel ? normalizeLevel(extractedLevel) : level;
        await scanDirectory(fullPath, newLevel);
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
          
          await pool.query(`
            INSERT INTO projects (
              canonical_id, slug, title, description, level, topic,
              requirements, topics_covered, estimated_hours, steps, prerequisites
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT(canonical_id) DO UPDATE SET
              slug = EXCLUDED.slug,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              level = EXCLUDED.level,
              topic = EXCLUDED.topic,
              requirements = EXCLUDED.requirements,
              topics_covered = EXCLUDED.topics_covered,
              estimated_hours = EXCLUDED.estimated_hours,
              steps = EXCLUDED.steps,
              prerequisites = EXCLUDED.prerequisites,
              updated_at = CURRENT_TIMESTAMP
          `, [
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
          ]);
          
        } catch (error) {
          console.error(`Error indexing ${fullPath}:`, error);
        }
      }
    }
  }
  
  await scanDirectory(projectsPath);
}

export async function getKnowledgeBases(): Promise<KnowledgeBaseMetadata[]> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT 
      knowledgebase,
      COUNT(*) as file_count,
      COUNT(DISTINCT level) as level_count
    FROM knowledge_files
    GROUP BY knowledgebase
  `);
  
  return result.rows.map((base: { knowledgebase: string; file_count: string; level_count: string }) => ({
    name: base.knowledgebase,
    path: `./${base.knowledgebase}`,
    fileCount: parseInt(base.file_count, 10),
    levelCount: parseInt(base.level_count, 10),
  }));
}
