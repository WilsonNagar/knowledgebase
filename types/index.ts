export interface KnowledgeFile {
  id?: number;
  canonical_id: string;
  slug: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'overachiever';
  number: number;
  file_path: string;
  knowledgebase: string;
  tags: string;
  prerequisites: string;
  estimated_minutes: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeBaseMetadata {
  name: string;
  path: string;
  fileCount: number;
  levelCount: number;
}

export interface FrontMatter {
  number: number;
  title: string;
  slug: string;
  level: string;
  tags: string[];
  prerequisites: number[] | string[];
  estimated_minutes: number;
  contributors: string[];
  diagrams?: string[];
  examples?: string[];
  canonical_id: string;
}

export interface DuplicateCheck {
  file: KnowledgeFile;
  similarity: number;
  similarFiles: Array<{ file: KnowledgeFile; similarity: number }>;
}

export interface RoadmapNode {
  id: string;
  title: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'overachiever';
  knowledgebase: string;
  x?: number;
  y?: number;
  prerequisites?: string[];
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
}

export interface Roadmap {
  knowledgebase: string;
  topic?: string;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

