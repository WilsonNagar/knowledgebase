'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Project } from '@/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const topic = params.topic as string;
  const slug = params.slug as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${topic}/${slug}`);
        const data = await res.json();
        setProject(data.project);
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    if (topic && slug) {
      fetchProject();
    }
  }, [topic, slug]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'overachiever': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/projects/${topic}`}
        className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        ← Back to {topic.charAt(0).toUpperCase() + topic.slice(1)} Projects
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${getLevelColor(project.level)}`}>
              {project.level}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ⏱️ Estimated: {project.estimated_hours} hours
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {project.title}
        </h1>

        <p className="text-lg text-gray-600 mb-6">
          {project.description}
        </p>

        {project.topics_covered && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Topics Covered:</h3>
            <div className="flex gap-2 flex-wrap">
              {project.topics_covered.split(',').map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Project Requirements</h2>
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: project.requirements }} />
        </div>
      </div>

      {/* Prerequisites */}
      {project.prerequisites && project.prerequisites.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended Guides</h3>
          <p className="text-sm text-gray-600 mb-3">
            Review these guides before starting the project:
          </p>
          <ul className="list-disc list-inside space-y-2">
            {project.prerequisites.map((guideId, i) => (
              <li key={i}>
                <Link
                  href={`/read/${guideId}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Guide: {guideId}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Step-by-Step Guide</h2>
        <div className="space-y-8">
          {project.steps.map((step, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-6">
              <div className="flex items-start mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-gray-900">
                  {step.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-4 ml-11">
                {step.description}
              </p>

              {step.code_examples && (
                <div className="ml-11 mb-4">
                  <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto">
                    <code>{step.code_examples}</code>
                  </pre>
                </div>
              )}

              {step.hints && step.hints.length > 0 && (
                <div className="ml-11 mb-4">
                  <details className="bg-yellow-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-semibold text-gray-700">
                      💡 Hints
                    </summary>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                      {step.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}

              {step.guide_references && step.guide_references.length > 0 && (
                <div className="ml-11">
                  <p className="text-sm text-gray-500 mb-2">Reference Guides:</p>
                  <div className="flex gap-2 flex-wrap">
                    {step.guide_references.map((guideRef, i) => (
                      <Link
                        key={i}
                        href={`/read/${guideRef}`}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {guideRef}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

