import { NextRequest, NextResponse } from 'next/server';
import { getDb, getFiles } from '@/lib/db';
import { Roadmap, RoadmapNode, RoadmapEdge } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const knowledgebase = searchParams.get('knowledgebase') || 'android';
    const topic = searchParams.get('topic');
    
    // Get all files for this knowledge base/topic
    const files = await getFiles({
      knowledgebase,
      topic: topic || undefined,
    });
    
    // Sort by level and number
    const sortedFiles = files.sort((a, b) => {
      const levelOrder = { beginner: 0, intermediate: 1, advanced: 2, overachiever: 3 };
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return a.number - b.number;
    });
    
    // Create nodes
    const nodes: RoadmapNode[] = sortedFiles.map((file, index) => ({
      id: file.canonical_id,
      title: file.title,
      slug: file.slug,
      level: file.level,
      knowledgebase: file.knowledgebase,
      prerequisites: file.prerequisites ? file.prerequisites.split(',').map(p => p.trim()) : [],
    }));
    
    // Create edges based on prerequisites
    const edges: RoadmapEdge[] = [];
    const canonicalIdMap = new Map<string, string>();
    
    // Map canonical IDs to file canonical IDs
    files.forEach(file => {
      canonicalIdMap.set(file.canonical_id, file.canonical_id);
      // Also map by slug if needed
      canonicalIdMap.set(file.slug, file.canonical_id);
    });
    
    nodes.forEach(node => {
      if (node.prerequisites && node.prerequisites.length > 0) {
        node.prerequisites.forEach(prereq => {
          // Try to find the prerequisite by canonical_id or slug
          const prereqId = canonicalIdMap.get(prereq);
          if (prereqId && prereqId !== node.id) {
            edges.push({
              id: `${prereqId}-${node.id}`,
              source: prereqId,
              target: node.id,
            });
          } else {
            // Try to find by number (if prereq is a number)
            const prereqNum = parseInt(prereq);
            if (!isNaN(prereqNum)) {
              const prereqFile = files.find(f => f.number === prereqNum);
              if (prereqFile && prereqFile.canonical_id !== node.id) {
                edges.push({
                  id: `${prereqFile.canonical_id}-${node.id}`,
                  source: prereqFile.canonical_id,
                  target: node.id,
                });
              }
            }
          }
        });
      } else {
        // If no prerequisites, connect to previous node in same level or previous level
        const nodeIndex = nodes.indexOf(node);
        if (nodeIndex > 0) {
          const prevNode = nodes[nodeIndex - 1];
          const levelOrder = { beginner: 0, intermediate: 1, advanced: 2, overachiever: 3 };
          const currentLevel = levelOrder[node.level];
          const prevLevel = levelOrder[prevNode.level];
          
          // Connect if same level or previous level
          if (currentLevel === prevLevel || currentLevel === prevLevel + 1) {
            edges.push({
              id: `${prevNode.id}-${node.id}`,
              source: prevNode.id,
              target: node.id,
            });
          }
        }
      }
    });
    
    const roadmap: Roadmap = {
      knowledgebase,
      topic: topic || undefined,
      nodes,
      edges,
    };
    
    return NextResponse.json({ roadmap });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    return NextResponse.json(
      { error: 'Failed to generate roadmap', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

