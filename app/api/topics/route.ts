import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const knowledgebase = searchParams.get('knowledgebase');
    
    if (!knowledgebase) {
      return NextResponse.json(
        { error: 'knowledgebase parameter is required' },
        { status: 400 }
      );
    }
    
    const db = getDb();
    
    // Get all files for this knowledge base
    const files = db.prepare(`
      SELECT DISTINCT file_path, level
      FROM knowledge_files
      WHERE knowledgebase = ?
    `).all(knowledgebase) as Array<{ file_path: string; level: string }>;
    
    // Extract topics from file paths
    // For computer_science: computer_science/databases/01_beginners/file.md
    // Extract "databases" as the topic
    const topics = new Map<string, { fileCount: number; levels: Set<string> }>();
    
    files.forEach(file => {
      const pathParts = file.file_path.split('/');
      const knowledgebaseIndex = pathParts.indexOf(knowledgebase);
      
      if (knowledgebaseIndex !== -1 && pathParts.length > knowledgebaseIndex + 1) {
        const topic = pathParts[knowledgebaseIndex + 1];
        
        // Skip level folders (01_beginners, etc.)
        if (!topic.match(/^\d+_(.+)$/)) {
          if (!topics.has(topic)) {
            topics.set(topic, { fileCount: 0, levels: new Set() });
          }
          const topicData = topics.get(topic)!;
          topicData.fileCount++;
          topicData.levels.add(file.level);
        }
      }
    });
    
    // Convert to array format
    const topicsArray = Array.from(topics.entries()).map(([name, data]) => ({
      name,
      fileCount: data.fileCount,
      levelCount: data.levels.size,
    }));
    
    // Sort by name
    topicsArray.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({ topics: topicsArray });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

