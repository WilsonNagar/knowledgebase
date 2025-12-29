import { NextRequest, NextResponse } from 'next/server';
import { indexFiles, getKnowledgeBases } from '@/lib/db';
import { join } from 'path';

export async function GET() {
  try {
    const bases = await getKnowledgeBases();
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
    
    // Map knowledgebase names to paths - use process.cwd() to ensure correct path resolution
    const projectRoot = process.cwd();
    const knowledgebasePaths: Record<string, string> = {
      'android': join(projectRoot, 'android'),
      'devops': join(projectRoot, 'devops'),
      'backend': join(projectRoot, 'backend'),
      'golang': join(projectRoot, 'golang'),
      'aosp': join(projectRoot, 'aosp'),
      'computer_science': join(projectRoot, 'computer_science'),
      'computer-science': join(projectRoot, 'computer_science'),
    };
    
    const path = knowledgebasePaths[knowledgebase] || join(projectRoot, knowledgebase);
    
    await indexFiles(path);
    
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



