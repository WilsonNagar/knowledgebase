import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const pool = getDb();
    
    const result = await pool.query(`
      SELECT 
        topic as name,
        COUNT(*) as projectCount
      FROM projects
      GROUP BY topic
      ORDER BY topic ASC
    `);
    const topics = result.rows as Array<{ name: string; projectCount: string }>;

    const topicDisplayNames: Record<string, string> = {
      android: 'Android Development',
      devops: 'DevOps',
      backend: 'Backend Development',
      frontend: 'Frontend Development',
      fullstack: 'Full Stack Development',
      mobile: 'Mobile Development',
      web: 'Web Development',
    };

    const topicsWithDisplay = topics.map(topic => ({
      name: topic.name,
      displayName: topicDisplayNames[topic.name] || topic.name.charAt(0).toUpperCase() + topic.name.slice(1),
      projectCount: parseInt(topic.projectCount, 10),
    }));

    return NextResponse.json({ topics: topicsWithDisplay });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
