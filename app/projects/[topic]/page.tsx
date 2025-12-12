'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Project } from '@/types';

export default function TopicProjectsPage() {
  const params = useParams();
  const topic = params.topic as string;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects?topic=${topic}`);
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (topic) {
      fetchProjects();
    }
  }, [topic]);

  const topicDisplayNames: Record<string, string> = {
    android: 'Android Development',
    devops: 'DevOps',
    backend: 'Backend Development',
    frontend: 'Frontend Development',
    fullstack: 'Full Stack Development',
    mobile: 'Mobile Development',
    web: 'Web Development',
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'overachiever': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProjects = selectedLevel
    ? projects.filter(p => p.level === selectedLevel)
    : projects;

  const projectsByLevel = {
    beginner: projects.filter(p => p.level === 'beginner'),
    intermediate: projects.filter(p => p.level === 'intermediate'),
    advanced: projects.filter(p => p.level === 'advanced'),
    overachiever: projects.filter(p => p.level === 'overachiever'),
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
      <div className="mb-8">
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {topicDisplayNames[topic] || topic.charAt(0).toUpperCase() + topic.slice(1)} Projects
        </h1>
        <p className="text-gray-600">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} available
        </p>
      </div>

      {/* Level Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedLevel(null)}
            className={`px-4 py-2 rounded-lg ${
              !selectedLevel
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Levels
          </button>
          <button
            onClick={() => setSelectedLevel('beginner')}
            className={`px-4 py-2 rounded-lg ${
              selectedLevel === 'beginner'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Beginner ({projectsByLevel.beginner.length})
          </button>
          <button
            onClick={() => setSelectedLevel('intermediate')}
            className={`px-4 py-2 rounded-lg ${
              selectedLevel === 'intermediate'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Intermediate ({projectsByLevel.intermediate.length})
          </button>
          <button
            onClick={() => setSelectedLevel('advanced')}
            className={`px-4 py-2 rounded-lg ${
              selectedLevel === 'advanced'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Advanced ({projectsByLevel.advanced.length})
          </button>
          <button
            onClick={() => setSelectedLevel('overachiever')}
            className={`px-4 py-2 rounded-lg ${
              selectedLevel === 'overachiever'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overachiever ({projectsByLevel.overachiever.length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg mb-4">
            {selectedLevel
              ? `No ${selectedLevel} projects available for this topic.`
              : 'No projects available for this topic yet.'}
          </p>
          <p className="text-gray-400">
            Check back later or browse other topics!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.canonical_id}
              href={`/projects/${topic}/${project.slug}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(project.level)}`}>
                  {project.level}
                </span>
                <span className="text-sm text-gray-500">
                  ⏱️ {project.estimated_hours}h
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {project.title}
              </h2>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {project.description}
              </p>
              {project.topics_covered && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {project.topics_covered.split(',').slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-sm text-blue-600 font-medium">
                View Project →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

