const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dbPath = process.env.DB_PATH || './data/knowledgebase.db';
const projectsPath = process.argv[2] || './projects';

const db = new Database(dbPath);

// Initialize projects table if needed
db.exec(`
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
        
        // Extract challenges/steps from markdown
        const steps = extractSteps(body);
        
        // Extract requirements section
        const requirements = extractRequirements(body);
        
        const project = {
          canonical_id: data.canonical_id || `project-${Date.now()}`,
          slug: data.slug || entry.name.replace('.md', ''),
          title: data.title || entry.name,
          description: data.description || '',
          level: normalizeLevel(data.level || level),
          topic: data.topic || path.basename(path.dirname(path.dirname(fullPath))),
          requirements: requirements || body.substring(0, 1000),
          topics_covered: Array.isArray(data.topics_covered) 
            ? data.topics_covered.join(',') 
            : (data.topics_covered || ''),
          estimated_hours: data.estimated_hours || 0,
          steps: JSON.stringify(steps),
          prerequisites: data.prerequisites 
            ? JSON.stringify(Array.isArray(data.prerequisites) ? data.prerequisites : [data.prerequisites])
            : null,
        };
        
        // Insert or update
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
        
        console.log(`✓ Indexed: ${project.title} (${project.topic}/${project.level})`);
        
      } catch (error) {
        console.error(`Error indexing ${fullPath}:`, error.message);
      }
    }
  }
}

function extractSteps(content) {
  const steps = [];
  const challengeRegex = /^## Challenge \d+: (.+?) \((.+?)\)$/gm;
  const stepRegex = /^### Step \d+\.\d+: (.+)$/gm;
  
  let match;
  let currentChallenge = null;
  let challengeNumber = 0;
  
  // Split content by challenges
  const challengeSections = content.split(/^## Challenge \d+:/gm);
  
  challengeSections.forEach((section, index) => {
    if (index === 0) return; // Skip content before first challenge
    
    const challengeMatch = section.match(/^(.+?) \((.+?)\)$/m);
    if (!challengeMatch) return;
    
    const title = challengeMatch[1].trim();
    const difficulty = challengeMatch[2].trim();
    
    challengeNumber++;
    
    // Extract steps within this challenge
    const stepMatches = [...section.matchAll(/^### Step \d+\.\d+: (.+)$/gm)];
    const stepsInChallenge = stepMatches.map((m, i) => ({
      number: challengeNumber * 100 + (i + 1),
      title: m[1].trim(),
      description: extractStepDescription(section, m.index),
      guide_references: extractGuideReferences(section),
      code_examples: extractCodeExamples(section),
      hints: extractHints(section),
    }));
    
    steps.push({
      challenge_number: challengeNumber,
      challenge_title: title,
      difficulty: difficulty.toLowerCase(),
      steps: stepsInChallenge,
      completion_status: 'not_started',
    });
  });
  
  return steps;
}

function extractStepDescription(section, stepIndex) {
  // Get content after step title until next step or section
  const afterStep = section.substring(stepIndex);
  const nextStepMatch = afterStep.match(/\n### Step \d+\.\d+:/);
  const endIndex = nextStepMatch ? nextStepMatch.index : afterStep.length;
  
  let description = afterStep.substring(0, endIndex);
  
  // Remove code blocks and hints sections for description
  description = description.replace(/```[\s\S]*?```/g, '');
  description = description.replace(/### Hints[\s\S]*?###/g, '');
  description = description.replace(/### Guide References[\s\S]*?###/g, '');
  
  // Get first paragraph
  const lines = description.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.slice(0, 3).join(' ').substring(0, 500);
}

function extractGuideReferences(section) {
  const refs = [];
  const refMatch = section.match(/### Guide References[\s\S]*?###/);
  if (refMatch) {
    const refSection = refMatch[0];
    const linkMatches = [...refSection.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    linkMatches.forEach(m => {
      const slug = m[2].match(/\/([^/]+)\.md/)?.[1];
      if (slug) refs.push(slug);
    });
  }
  return refs;
}

function extractCodeExamples(section) {
  const codeBlocks = [];
  const codeMatches = [...section.matchAll(/```[\s\S]*?```/g)];
  codeMatches.forEach(m => {
    codeBlocks.push(m[0]);
  });
  return codeBlocks.join('\n\n');
}

function extractHints(section) {
  const hints = [];
  const hintsMatch = section.match(/### Hints[\s\S]*?(?=###|$)/);
  if (hintsMatch) {
    const hintsSection = hintsMatch[0];
    const listMatches = [...hintsSection.matchAll(/^[-*] (.+)$/gm)];
    listMatches.forEach(m => {
      hints.push(m[1].trim());
    });
  }
  return hints;
}

function extractRequirements(content) {
  const reqMatch = content.match(/### Project Requirements[\s\S]*?(?=##|$)/);
  if (reqMatch) {
    return reqMatch[0];
  }
  return null;
}

// Start scanning
console.log('Indexing projects...\n');
scanDirectory(projectsPath);
console.log('\n✓ Project indexing complete!');

db.close();

