import { NextRequest, NextResponse } from 'next/server';
import { getFiles, getFileBySlug, indexFiles } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const knowledgebase = searchParams.get('knowledgebase') || 'android';
    const tags = searchParams.get('tags')?.split(',');
    
    const files = getFiles({
      level: level || undefined,
      knowledgebase,
      tags: tags || undefined,
    });
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'reindex') {
      const knowledgebase = request.nextUrl.searchParams.get('knowledgebase') || './android';
      indexFiles(knowledgebase);
      return NextResponse.json({ success: true, message: 'Reindexed successfully' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/files:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

