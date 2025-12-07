'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KnowledgeBaseMetadata } from '@/types';

interface Topic {
  name: string;
  fileCount: number;
  levelCount: number;
}

export default function Home() {
  const [knowledgebases, setKnowledgebases] = useState<KnowledgeBaseMetadata[]>([]);
  const [computerScienceTopics, setComputerScienceTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch knowledge bases
    fetch('/api/index')
      .then(res => res.json())
      .then(data => {
        setKnowledgebases(data.knowledgebases || []);
        
        // Fetch topics for computer_science
        const csKb = data.knowledgebases?.find((kb: KnowledgeBaseMetadata) => kb.name === 'computer_science');
        if (csKb) {
          return fetch('/api/topics?knowledgebase=computer_science');
        }
        return Promise.resolve({ json: () => Promise.resolve({ topics: [] }) });
      })
      .then(res => res.json())
      .then(data => {
        setComputerScienceTopics(data.topics || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
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
          Knowledge Base
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A comprehensive, multi-level knowledge base covering Android development and Computer Science.
          Learn from beginner concepts to advanced architecture patterns.
        </p>
      </div>

      {/* Android Knowledge Base */}
      {knowledgebases.filter(kb => kb.name === 'android').length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Android Development</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgebases
              .filter(kb => kb.name === 'android')
              .map((kb) => (
                <Link
                  key={kb.name}
                  href={`/browse?knowledgebase=${kb.name}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {kb.name.charAt(0).toUpperCase() + kb.name.slice(1)}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {kb.fileCount} files across {kb.levelCount} levels
                  </p>
                  <div className="text-sm text-blue-600 font-medium">
                    Browse → 
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Computer Science Topics */}
      {computerScienceTopics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Computer Science Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {computerScienceTopics.map((topic) => (
              <Link
                key={topic.name}
                href={`/browse?knowledgebase=computer_science&topic=${topic.name}`}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {topic.name.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {topic.fileCount} files across {topic.levelCount} levels
                </p>
                <div className="text-sm text-blue-600 font-medium">
                  Browse → 
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
              Start your learning journey with fundamentals
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
              Master complex development challenges
            </p>
          </Link>
          <Link
            href="/browse?level=overachiever"
            className="border-2 border-orange-200 rounded-lg p-4 hover:border-orange-400 transition-colors"
          >
            <h3 className="font-semibold text-orange-800 mb-2">⭐ Overachiever</h3>
            <p className="text-sm text-gray-600">
              Push the boundaries of engineering excellence
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



