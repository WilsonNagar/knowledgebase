import { NextRequest, NextResponse } from 'next/server';
import { getDb, getFiles } from '@/lib/db';
import { findSimilarFiles } from '@/lib/similarity';
import { KnowledgeFile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { frontmatter, content, knowledgebase = 'android' } = await request.json();
    
    if (!frontmatter || !content) {
      return NextResponse.json(
        { error: 'Missing frontmatter or content' },
        { status: 400 }
      );
    }
    
    const allFiles = getFiles({ knowledgebase });
    const db = getDb();
    
    // Check canonical_id
    const existingId = db.prepare('SELECT * FROM knowledge_files WHERE canonical_id = ?')
      .get(frontmatter.canonical_id);
    
    // Check slug
    const existingSlug = db.prepare(
      'SELECT * FROM knowledge_files WHERE slug = ? AND knowledgebase = ?'
    ).get(frontmatter.slug, knowledgebase);
    
    // Check similarity
    const testFile: KnowledgeFile = {
      canonical_id: frontmatter.canonical_id,
      slug: frontmatter.slug,
      title: frontmatter.title,
      level: frontmatter.level,
      number: frontmatter.number,
      file_path: '',
      knowledgebase,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(',') : '',
      prerequisites: Array.isArray(frontmatter.prerequisites) 
        ? frontmatter.prerequisites.join(',') 
        : '',
      estimated_minutes: frontmatter.estimated_minutes || 0,
      content,
    };
    
    const similarFiles = findSimilarFiles(testFile, allFiles, 0.5);
    
    return NextResponse.json({
      duplicateCanonicalId: !!existingId,
      duplicateSlug: !!existingSlug,
      similarFiles: similarFiles.map(s => ({
        canonical_id: s.file.canonical_id,
        title: s.file.title,
        slug: s.file.slug,
        similarity: s.similarity,
      })),
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}


