import { KnowledgeFile } from '@/types';
import stringSimilarity from 'string-similarity';

export function calculateSimilarity(file1: KnowledgeFile, file2: KnowledgeFile): number {
  // Compare titles
  const titleSimilarity = stringSimilarity.compareTwoStrings(
    file1.title.toLowerCase(),
    file2.title.toLowerCase()
  );
  
  // Compare content (first 1000 chars for performance)
  const content1 = file1.content.substring(0, 1000).toLowerCase();
  const content2 = file2.content.substring(0, 1000).toLowerCase();
  const contentSimilarity = stringSimilarity.compareTwoStrings(content1, content2);
  
  // Compare tags
  const tags1 = file1.tags.split(',').map(t => t.trim().toLowerCase());
  const tags2 = file2.tags.split(',').map(t => t.trim().toLowerCase());
  const commonTags = tags1.filter(t => tags2.includes(t));
  const tagSimilarity = tags1.length > 0 && tags2.length > 0
    ? (commonTags.length * 2) / (tags1.length + tags2.length)
    : 0;
  
  // Weighted average
  return (titleSimilarity * 0.4 + contentSimilarity * 0.4 + tagSimilarity * 0.2);
}

export function findSimilarFiles(
  targetFile: KnowledgeFile,
  allFiles: KnowledgeFile[],
  threshold: number = 0.6
): Array<{ file: KnowledgeFile; similarity: number }> {
  const similarities = allFiles
    .filter(f => f.canonical_id !== targetFile.canonical_id)
    .map(file => ({
      file,
      similarity: calculateSimilarity(targetFile, file),
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  return similarities;
}

