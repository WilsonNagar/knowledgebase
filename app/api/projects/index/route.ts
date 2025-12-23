import { NextRequest, NextResponse } from 'next/server';
import { indexProjects } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectsPath = body.path || './projects';
    
    await indexProjects(projectsPath);
    
    return NextResponse.json({ 
      success: true, 
      message: `Indexed projects from ${projectsPath}` 
    });
  } catch (error) {
    console.error('Error indexing projects:', error);
    return NextResponse.json(
      { error: 'Failed to index projects', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

