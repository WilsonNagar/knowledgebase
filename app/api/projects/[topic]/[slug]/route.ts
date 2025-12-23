import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Project } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topic: string; slug: string }> }
) {
  try {
    const { topic, slug } = await params;
    const pool = getDb();
    
    const result = await pool.query(`
      SELECT * FROM projects
      WHERE topic = $1 AND slug = $2
    `, [topic, slug]);
    const project = result.rows[0] as any;

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
