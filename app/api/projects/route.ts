import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Project } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get('topic');
    const level = searchParams.get('level');

    const db = getDb();
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (topic) {
      query += ' AND topic = ?';
      params.push(topic);
    }

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    query += ' ORDER BY level, title ASC';

    const projects = db.prepare(query).all(...params) as any[];

    // Parse JSON fields
    const parsedProjects: Project[] = projects.map(p => ({
      ...p,
      steps: JSON.parse(p.steps || '[]'),
      prerequisites: p.prerequisites ? JSON.parse(p.prerequisites) : undefined,
    }));

    return NextResponse.json({ projects: parsedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const project: Project = await request.json();

    const db = getDb();
    
    db.prepare(`
      INSERT INTO projects (
        canonical_id, slug, title, description, level, topic,
        requirements, topics_covered, estimated_hours, steps, prerequisites
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(canonical_id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        description = excluded.description,
        level = excluded.level,
        topic = excluded.topic,
        requirements = excluded.requirements,
        topics_covered = excluded.topics_covered,
        estimated_hours = excluded.estimated_hours,
        steps = excluded.steps,
        prerequisites = excluded.prerequisites,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      project.canonical_id,
      project.slug,
      project.title,
      project.description,
      project.level,
      project.topic,
      project.requirements,
      project.topics_covered || '',
      project.estimated_hours,
      JSON.stringify(project.steps),
      project.prerequisites ? JSON.stringify(project.prerequisites) : null
    );

    return NextResponse.json({ success: true, message: 'Project created/updated' });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

