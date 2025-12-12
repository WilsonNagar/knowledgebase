import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Project } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { topic: string; slug: string } }
) {
  try {
    const db = getDb();
    
    const project = db.prepare(`
      SELECT * FROM projects
      WHERE topic = ? AND slug = ?
    `).get(params.topic, params.slug) as any;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedProject: Project = {
      ...project,
      steps: JSON.parse(project.steps || '[]'),
      prerequisites: project.prerequisites ? JSON.parse(project.prerequisites) : undefined,
    };

    return NextResponse.json({ project: parsedProject });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

