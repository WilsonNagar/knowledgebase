'use client';

import Link from 'next/link';
import { Roadmap as RoadmapType, RoadmapNode } from '@/types';

interface RoadmapProps {
  roadmap: RoadmapType;
  compact?: boolean;
}

export default function Roadmap({ roadmap, compact = false }: RoadmapProps) {
  // Group nodes by level
  const nodesByLevel = roadmap.nodes.reduce((acc, node) => {
    if (!acc[node.level]) {
      acc[node.level] = [];
    }
    acc[node.level].push(node);
    return acc;
  }, {} as Record<string, RoadmapNode[]>);

  const levelOrder = ['beginner', 'intermediate', 'advanced', 'overachiever'] as const;
  type Level = typeof levelOrder[number];
  const levelColors: Record<Level, string> = {
    beginner: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
    intermediate: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200',
    advanced: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200',
    overachiever: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200',
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {roadmap.topic 
            ? `${roadmap.topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Roadmap`
            : `${roadmap.knowledgebase.charAt(0).toUpperCase() + roadmap.knowledgebase.slice(1)} Roadmap`
          }
        </h3>
        <div className="space-y-4">
          {levelOrder.map((level) => {
            const nodes = nodesByLevel[level] || [];
            if (nodes.length === 0) return null;
            
            return (
              <div key={level} className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 capitalize">{level}</h4>
                <div className="flex flex-wrap gap-2">
                  {nodes.slice(0, 5).map((node) => (
                    <Link
                      key={node.id}
                      href={`/read/${node.slug}?knowledgebase=${node.knowledgebase}`}
                      className={`px-3 py-1 rounded text-xs border ${levelColors[level as Level]} transition-shadow`}
                    >
                      {node.title}
                    </Link>
                  ))}
                  {nodes.length > 5 && (
                    <span className="px-3 py-1 text-xs text-gray-500">
                      +{nodes.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Link
          href={`/roadmap?knowledgebase=${roadmap.knowledgebase}${roadmap.topic ? `&topic=${roadmap.topic}` : ''}`}
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Full Roadmap →
        </Link>
      </div>
    );
  }

  // Full roadmap view with connected nodes
  return (
    <div className="bg-white rounded-lg shadow-md p-8 overflow-x-auto">
      <div className="min-w-max">
        {levelOrder.map((level, levelIndex) => {
          const nodes = nodesByLevel[level] || [];
          if (nodes.length === 0) return null;
          
          return (
            <div key={level} className="mb-12">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${levelColors[level as Level].split(' ')[0]}`}></span>
                {level}
              </h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {nodes.map((node, nodeIndex) => {
                  const hasPrereq = roadmap.edges.some(e => e.target === node.id);
                  const hasNext = roadmap.edges.some(e => e.source === node.id);
                  
                  return (
                    <div key={node.id} className="relative">
                      <Link
                        href={`/read/${node.slug}?knowledgebase=${node.knowledgebase}`}
                        className={`block px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${levelColors[level as Level]} ${
                          hasPrereq ? 'border-l-4' : ''
                        }`}
                        style={{ minWidth: '180px', textAlign: 'center' }}
                      >
                        {node.title}
                      </Link>
                      {hasNext && nodeIndex < nodes.length - 1 && (
                        <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-400">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {levelIndex < levelOrder.length - 1 && (
                <div className="flex justify-center my-4">
                  <div className="w-px h-8 bg-gray-300"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

