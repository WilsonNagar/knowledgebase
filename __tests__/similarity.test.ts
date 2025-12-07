import { calculateSimilarity, findSimilarFiles } from '../lib/similarity';
import { KnowledgeFile } from '../types';

describe('Similarity utilities', () => {
  const file1: KnowledgeFile = {
    canonical_id: 'android-01',
    slug: 'test-1',
    title: 'Introduction to Android',
    level: 'beginner',
    number: 1,
    file_path: '/test1.md',
    knowledgebase: 'android',
    tags: 'architecture, fundamentals',
    prerequisites: '',
    estimated_minutes: 30,
    content: 'This is a test content about Android development basics.',
  };

  const file2: KnowledgeFile = {
    canonical_id: 'android-02',
    slug: 'test-2',
    title: 'Introduction to Android Development',
    level: 'beginner',
    number: 2,
    file_path: '/test2.md',
    knowledgebase: 'android',
    tags: 'architecture, fundamentals',
    prerequisites: '',
    estimated_minutes: 30,
    content: 'This is a test content about Android development basics and fundamentals.',
  };

  const file3: KnowledgeFile = {
    canonical_id: 'android-03',
    slug: 'test-3',
    title: 'Kotlin Coroutines',
    level: 'intermediate',
    number: 3,
    file_path: '/test3.md',
    knowledgebase: 'android',
    tags: 'kotlin, coroutines',
    prerequisites: '',
    estimated_minutes: 45,
    content: 'This is about Kotlin coroutines and async programming.',
  };

  describe('calculateSimilarity', () => {
    it('should calculate similarity between similar files', () => {
      const similarity = calculateSimilarity(file1, file2);
      
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    it('should calculate low similarity for different files', () => {
      const similarity = calculateSimilarity(file1, file3);
      
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 1.0 for identical files', () => {
      const similarity = calculateSimilarity(file1, file1);
      
      expect(similarity).toBe(1.0);
    });
  });

  describe('findSimilarFiles', () => {
    it('should find similar files above threshold', () => {
      const allFiles = [file1, file2, file3];
      const similar = findSimilarFiles(file1, allFiles, 0.5);
      
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].file.canonical_id).toBe('android-02');
    });

    it('should not return the same file', () => {
      const allFiles = [file1, file2, file3];
      const similar = findSimilarFiles(file1, allFiles, 0.5);
      
      expect(similar.every(s => s.file.canonical_id !== file1.canonical_id)).toBe(true);
    });

    it('should return empty array when threshold is too high', () => {
      const allFiles = [file1, file2, file3];
      const similar = findSimilarFiles(file1, allFiles, 0.99);
      
      expect(similar.length).toBe(0);
    });
  });
});


