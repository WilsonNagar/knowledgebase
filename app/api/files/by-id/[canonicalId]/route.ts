import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ canonicalId: string }> }
) {
  try {
    const { canonicalId } = await params;
    const pool = getDb();
    
    // Try multiple lookup strategies
    // 1. Try as canonical_id
    let result = await pool.query(`
      SELECT slug, knowledgebase, canonical_id
      FROM knowledge_files
      WHERE canonical_id = $1
    `, [canonicalId]);
    let file = result.rows[0] as { slug: string; knowledgebase: string; canonical_id: string } | undefined;

    // 2. Try as slug
    if (!file) {
      result = await pool.query(`
        SELECT slug, knowledgebase, canonical_id
        FROM knowledge_files
        WHERE slug = $1
      `, [canonicalId]);
      file = result.rows[0] as { slug: string; knowledgebase: string; canonical_id: string } | undefined;
    }

    // 3. Try matching filename pattern (for cases like "14. Android Services - Complete Guide")
    if (!file) {
      // Try to match by file_path containing the decoded filename
      const decodedId = decodeURIComponent(canonicalId);
      result = await pool.query(`
        SELECT slug, knowledgebase, canonical_id
        FROM knowledge_files
        WHERE file_path LIKE $1
        LIMIT 1
      `, [`%/${decodedId}.md`]);
      file = result.rows[0] as { slug: string; knowledgebase: string; canonical_id: string } | undefined;
    }

    // 4. Try matching title (for cases where filename doesn't match)
    if (!file) {
      const decodedId = decodeURIComponent(canonicalId);
      result = await pool.query(`
        SELECT slug, knowledgebase, canonical_id
        FROM knowledge_files
        WHERE title LIKE $1
        LIMIT 1
      `, [`%${decodedId}%`]);
      file = result.rows[0] as { slug: string; knowledgebase: string; canonical_id: string } | undefined;
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Guide not found', searched: canonicalId },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      slug: file.slug,
      knowledgebase: file.knowledgebase,
      canonical_id: file.canonical_id,
      url: `/read/${file.slug}?knowledgebase=${file.knowledgebase}`
    });
  } catch (error) {
    console.error('Error fetching guide:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guide', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
