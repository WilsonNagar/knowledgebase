import { NextRequest, NextResponse } from 'next/server';
import { indexFiles, getKnowledgeBases } from '@/lib/db';

export async function GET() {
  try {
    const bases = getKnowledgeBases();
    return NextResponse.json({ knowledgebases: bases });
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge bases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { knowledgebase } = await request.json();
    const path = knowledgebase || './android';
    
    indexFiles(path);
    
    return NextResponse.json({ 
      success: true, 
      message: `Indexed ${knowledgebase || 'android'} knowledge base` 
    });
  } catch (error) {
    console.error('Error indexing:', error);
    return NextResponse.json(
      { error: 'Failed to index knowledge base' },
      { status: 500 }
    );
  }
}


