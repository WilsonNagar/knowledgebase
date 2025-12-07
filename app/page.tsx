'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KnowledgeBaseMetadata } from '@/types';

export default function Home() {
  const [knowledgebases, setKnowledgebases] = useState<KnowledgeBaseMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/index')
      .then(res => res.json())
      .then(data => {
        setKnowledgebases(data.knowledgebases || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching knowledge bases:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Android Knowledge Base
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A comprehensive, multi-level knowledge base for advanced Android app developers.
          Learn from beginner concepts to overachiever-level architecture patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {knowledgebases.map((kb) => (
          <Link
            key={kb.name}
            href={`/browse?knowledgebase=${kb.name}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {kb.name.charAt(0).toUpperCase() + kb.name.slice(1)}
            </h2>
            <p className="text-gray-600 mb-4">
              {kb.fileCount} files across {kb.levelCount} levels
            </p>
            <div className="text-sm text-blue-600 font-medium">
              Browse → 
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Learning Paths
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/browse?level=beginner"
            className="border-2 border-green-200 rounded-lg p-4 hover:border-green-400 transition-colors"
          >
            <h3 className="font-semibold text-green-800 mb-2">🌱 Beginner</h3>
            <p className="text-sm text-gray-600">
              Start your Android journey with fundamentals
            </p>
          </Link>
          <Link
            href="/browse?level=intermediate"
            className="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
          >
            <h3 className="font-semibold text-blue-800 mb-2">📘 Intermediate</h3>
            <p className="text-sm text-gray-600">
              Build on your foundation with advanced patterns
            </p>
          </Link>
          <Link
            href="/browse?level=advanced"
            className="border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 transition-colors"
          >
            <h3 className="font-semibold text-purple-800 mb-2">🚀 Advanced</h3>
            <p className="text-sm text-gray-600">
              Master complex Android development challenges
            </p>
          </Link>
          <Link
            href="/browse?level=overachiever"
            className="border-2 border-orange-200 rounded-lg p-4 hover:border-orange-400 transition-colors"
          >
            <h3 className="font-semibold text-orange-800 mb-2">⭐ Overachiever</h3>
            <p className="text-sm text-gray-600">
              Push the boundaries of Android engineering
            </p>
          </Link>
        </div>
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Quick Start
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Browse by level or use the search to find specific topics</li>
          <li>Read articles with interactive diagrams and code examples</li>
          <li>Test your knowledge with built-in quizzes</li>
          <li>Track your progress and bookmark important articles</li>
        </ol>
      </div>
    </div>
  );
}


