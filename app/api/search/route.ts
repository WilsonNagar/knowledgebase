import { NextRequest, NextResponse } from 'next/server';
import { searchFiles } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const level = searchParams.get('level');
    const knowledgebase = searchParams.get('knowledgebase');
    const topic = searchParams.get('topic');
    
    if (!query.trim()) {
      return NextResponse.json({ files: [] });
    }
    
    const files = await searchFiles(query, {
      level: level || undefined,
      knowledgebase: knowledgebase || undefined,
      topic: topic || undefined,
    });
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
}



