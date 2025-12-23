import { NextRequest, NextResponse } from 'next/server';
import { getFileByFilename } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    const knowledgebase = searchParams.get('knowledgebase');
    
    if (!filename) {
      return NextResponse.json(
        { error: 'filename parameter is required' },
        { status: 400 }
      );
    }
    
    const file = await getFileByFilename(filename, knowledgebase || undefined);
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      slug: file.slug, 
      knowledgebase: file.knowledgebase 
    });
  } catch (error) {
    console.error('Error resolving filename:', error);
    return NextResponse.json(
      { error: 'Failed to resolve filename' },
      { status: 500 }
    );
  }
}

