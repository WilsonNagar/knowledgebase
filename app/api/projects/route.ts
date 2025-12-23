import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Project } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get('topic');
    const level = searchParams.get('level');

    const pool = getDb();
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (topic) {
      query += ` AND topic = $${paramIndex}`;
      params.push(topic);
      paramIndex++;
    }

    if (level) {
      query += ` AND level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    query += ' ORDER BY level, title ASC';

    const result = await pool.query(query, params);
    const projects = result.rows;

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

    const pool = getDb();
    
    await pool.query(`
      INSERT INTO projects (
        canonical_id, slug, title, description, level, topic,
        requirements, topics_covered, estimated_hours, steps, prerequisites
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT(canonical_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        level = EXCLUDED.level,
        topic = EXCLUDED.topic,
        requirements = EXCLUDED.requirements,
        topics_covered = EXCLUDED.topics_covered,
        estimated_hours = EXCLUDED.estimated_hours,
        steps = EXCLUDED.steps,
        prerequisites = EXCLUDED.prerequisites,
        updated_at = CURRENT_TIMESTAMP
    `, [
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
    ]);

    return NextResponse.json({ success: true, message: 'Project created/updated' });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
