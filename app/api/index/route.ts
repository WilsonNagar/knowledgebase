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
    const body = await request.json().catch(() => ({}));
    const knowledgebase = body.knowledgebase || 'android';
    
    // Map knowledgebase names to paths
    const knowledgebasePaths: Record<string, string> = {
      'android': './android',
      'devops': './devops',
      'backend': './backend',
      'golang': './golang',
      'computer_science': './computer_science',
      'computer-science': './computer_science',
    };
    
    const path = knowledgebasePaths[knowledgebase] || `./${knowledgebase}`;
    
    indexFiles(path);
    
    return NextResponse.json({ 
      success: true, 
      message: `Indexed ${knowledgebase} knowledge base` 
    });
  } catch (error) {
    console.error('Error indexing:', error);
    return NextResponse.json(
      { error: 'Failed to index knowledge base', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}



