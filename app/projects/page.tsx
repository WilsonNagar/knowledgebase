'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Topic {
  name: string;
  displayName: string;
  projectCount: number;
}

export default function ProjectsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch('/api/projects/topics');
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (error) {
        console.error('Error fetching topics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const topicDisplayNames: Record<string, string> = {
    android: 'Android Development',
    devops: 'DevOps',
    backend: 'Backend Development',
    frontend: 'Frontend Development',
    fullstack: 'Full Stack Development',
    mobile: 'Mobile Development',
    web: 'Web Development',
  };

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
          Project-Based Learning
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Build real-world projects step-by-step. Learn by doing with hands-on experience
          and guided tutorials.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Browse Projects by Topic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <Link
              key={topic.name}
              href={`/projects/${topic.name}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {topicDisplayNames[topic.name] || topic.displayName}
              </h3>
              <p className="text-gray-600 mb-4">
                {topic.projectCount} {topic.projectCount === 1 ? 'project' : 'projects'} available
              </p>
              <div className="text-sm text-blue-600 font-medium">
                View Projects →
              </div>
            </Link>
          ))}
        </div>
      </div>

      {topics.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg mb-4">
            No projects available yet.
          </p>
          <p className="text-gray-400">
            Projects will be added soon. Check back later!
          </p>
        </div>
      )}

      <div className="mt-12 bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          How Project-Based Learning Works
        </h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <strong>Choose a Project:</strong> Select a project that matches your skill level
            and interests
          </li>
          <li>
            <strong>Review Requirements:</strong> Understand what you&apos;ll build and what
            technologies you&apos;ll use
          </li>
          <li>
            <strong>Follow Step-by-Step Guide:</strong> Complete each step with detailed
            instructions and code examples
          </li>
          <li>
            <strong>Reference Guides:</strong> Access relevant guides when you need deeper
            understanding
          </li>
          <li>
            <strong>Build & Learn:</strong> Apply concepts hands-on and gain practical
            experience
          </li>
        </ol>
      </div>
    </div>
  );
}

