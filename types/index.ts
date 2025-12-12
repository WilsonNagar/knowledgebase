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

export interface ProjectStep {
  number: number;
  title: string;
  description: string;
  guide_references?: string[]; // Array of guide slugs or canonical_ids
  code_examples?: string;
  hints?: string[];
}

export interface Project {
  id?: number;
  canonical_id: string;
  slug: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'overachiever';
  topic: string; // android, devops, backend, etc.
  requirements: string; // Markdown content
  topics_covered: string; // Comma-separated tags
  estimated_hours: number;
  steps: ProjectStep[];
  prerequisites?: string[]; // Array of guide canonical_ids
  created_at?: string;
  updated_at?: string;
}

