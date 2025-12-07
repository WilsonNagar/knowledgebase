import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getDb, indexFiles } from '@/lib/db';
import { findSimilarFiles, calculateSimilarity } from '@/lib/similarity';
import { getFiles } from '@/lib/db';
import { FrontMatter } from '@/types';
import { z } from 'zod';

const fileSchema = z.object({
  frontmatter: z.object({
    number: z.number(),
    title: z.string(),
    slug: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'overachiever']),
    tags: z.array(z.string()),
    prerequisites: z.array(z.union([z.number(), z.string()])),
    estimated_minutes: z.number(),
    contributors: z.array(z.string()),
    diagrams: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
    canonical_id: z.string(),
  }),
  content: z.string(),
  knowledgebase: z.string().default('android'),
  levelFolder: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = fileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid file data', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { frontmatter, content, knowledgebase, levelFolder } = validation.data;
    const db = getDb();
    
    // Check for duplicate canonical_id
    const existing = db.prepare('SELECT * FROM knowledge_files WHERE canonical_id = ?')
      .get(frontmatter.canonical_id);
    
    if (existing) {
      return NextResponse.json(
        { error: 'Duplicate canonical_id', canonical_id: frontmatter.canonical_id },
        { status: 409 }
      );
    }
    
    // Check for duplicate slug in same knowledgebase
    const existingSlug = db.prepare(
      'SELECT * FROM knowledge_files WHERE slug = ? AND knowledgebase = ?'
    ).get(frontmatter.slug, knowledgebase);
    
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Duplicate slug in knowledgebase', slug: frontmatter.slug },
        { status: 409 }
      );
    }
    
    // Check for similar content
    const allFiles = getFiles({ knowledgebase });
    const newFile = {
      canonical_id: frontmatter.canonical_id,
      slug: frontmatter.slug,
      title: frontmatter.title,
      level: frontmatter.level,
      number: frontmatter.number,
      file_path: '',
      knowledgebase,
      tags: frontmatter.tags.join(','),
      prerequisites: frontmatter.prerequisites.join(','),
      estimated_minutes: frontmatter.estimated_minutes,
      content,
    };
    
    const similarFiles = findSimilarFiles(newFile as any, allFiles, 0.6);
    
    if (similarFiles.length > 0) {
      return NextResponse.json({
        error: 'Similar content detected',
        similarFiles: similarFiles.map(s => ({
          canonical_id: s.file.canonical_id,
          title: s.file.title,
          similarity: s.similarity,
        })),
        warning: 'Content similarity > 0.6 detected. Please review or merge.',
      }, { status: 409 });
    }
    
    // Generate filename
    const numberStr = String(frontmatter.number).padStart(2, '0');
    const filename = `${numberStr}. ${frontmatter.title}.md`;
    const filePath = join(process.cwd(), knowledgebase, levelFolder, filename);
    
    // Create directory if needed
    mkdirSync(dirname(filePath), { recursive: true });
    
    // Write file with frontmatter
    const frontmatterYaml = `---
number: ${frontmatter.number}
title: "${frontmatter.title}"
slug: "${frontmatter.slug}"
level: "${frontmatter.level}"
tags: [${frontmatter.tags.map(t => `"${t}"`).join(', ')}]
prerequisites: [${frontmatter.prerequisites.join(', ')}]
estimated_minutes: ${frontmatter.estimated_minutes}
contributors: [${frontmatter.contributors.map(c => `"${c}"`).join(', ')}]
${frontmatter.diagrams ? `diagrams: [${frontmatter.diagrams.map(d => `"${d}"`).join(', ')}]` : ''}
${frontmatter.examples ? `examples: [${frontmatter.examples.map(e => `"${e}"`).join(', ')}]` : ''}
canonical_id: "${frontmatter.canonical_id}"
---

${content}`;
    
    writeFileSync(filePath, frontmatterYaml, 'utf-8');
    
    // Index the new file
    indexFiles(join(process.cwd(), knowledgebase));
    
    return NextResponse.json({
      success: true,
      file: {
        canonical_id: frontmatter.canonical_id,
        slug: frontmatter.slug,
        title: frontmatter.title,
        file_path: filePath,
      },
    });
  } catch (error: any) {
    console.error('Error creating file:', error);
    return NextResponse.json(
      { error: 'Failed to create file', message: error.message },
      { status: 500 }
    );
  }
}


