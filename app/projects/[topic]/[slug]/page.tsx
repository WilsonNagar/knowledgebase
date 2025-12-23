'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Project } from '@/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CodeBlock from '@/components/CodeBlock';

interface Challenge {
  challenge_number: number;
  challenge_title: string;
  difficulty: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    guide_references?: string[];
    code_examples?: string;
    hints?: string[];
  }>;
  completion_status: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const topic = params.topic as string;
  const slug = params.slug as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChallenges, setExpandedChallenges] = useState<Set<number>>(new Set());
  const [completedChallenges, setCompletedChallenges] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [guideLinks, setGuideLinks] = useState<Record<string, { slug: string; knowledgebase: string; url: string }>>({});
  const [stepGuideLinks, setStepGuideLinks] = useState<Record<string, { slug: string; knowledgebase: string; url: string }>>({});

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${topic}/${slug}`);
        const data = await res.json();
        setProject(data.project);
        
        // Parse challenges from steps
        let parsedChallenges: Challenge[] = [];
        if (data.project && data.project.steps) {
          parsedChallenges = Array.isArray(data.project.steps) 
            ? (data.project.steps as unknown as Challenge[])
            : [];
          setChallenges(parsedChallenges);
        } else {
          setChallenges([]);
        }
        
        // Load completion status from localStorage
        if (data.project) {
          const saved = localStorage.getItem(`project-${data.project.canonical_id}-completed`);
          if (saved) {
            setCompletedChallenges(new Set(JSON.parse(saved)));
          }
          
          // Resolve guide links from canonical IDs
          if (data.project.prerequisites && data.project.prerequisites.length > 0) {
            const linkPromises = data.project.prerequisites.map(async (canonicalId: string) => {
              try {
                const res = await fetch(`/api/files/by-id/${canonicalId}`);
                const guideData = await res.json();
                return { canonicalId, ...guideData };
              } catch (error) {
                console.error(`Error fetching guide ${canonicalId}:`, error);
                return { canonicalId, slug: canonicalId, knowledgebase: 'android', url: `/read/${canonicalId}?knowledgebase=android` };
              }
            });
            
            const resolvedLinks = await Promise.all(linkPromises);
            const linksMap: Record<string, { slug: string; knowledgebase: string; url: string }> = {};
            resolvedLinks.forEach(link => {
              linksMap[link.canonicalId] = {
                slug: link.slug,
                knowledgebase: link.knowledgebase,
                url: link.url
              };
            });
            setGuideLinks(linksMap);
          }
          
          // Resolve guide references from all steps
          if (parsedChallenges.length > 0) {
            const allGuideRefs = new Set<string>();
            parsedChallenges.forEach((challenge: Challenge) => {
              challenge.steps.forEach((step: any) => {
                if (step.guide_references) {
                  step.guide_references.forEach((ref: string) => allGuideRefs.add(ref));
                }
              });
            });
            
            const stepLinkPromises = Array.from(allGuideRefs).map(async (guideRef: string) => {
              // Try to resolve guide reference (could be canonical_id, slug, or filename)
              try {
                const res = await fetch(`/api/files/by-id/${encodeURIComponent(guideRef)}`);
                if (res.ok) {
                  const guideData = await res.json();
                  return { guideRef, ...guideData };
                }
              } catch (error) {
                // Fall through to default
              }
              // Fallback: use guideRef as slug
              return { guideRef, slug: guideRef, knowledgebase: 'android', url: `/read/${guideRef}?knowledgebase=android` };
            });
            
            const resolvedStepLinks = await Promise.all(stepLinkPromises);
            const stepLinksMap: Record<string, { slug: string; knowledgebase: string; url: string }> = {};
            resolvedStepLinks.forEach(link => {
              stepLinksMap[link.guideRef] = {
                slug: link.slug,
                knowledgebase: link.knowledgebase,
                url: link.url
              };
            });
            setStepGuideLinks(stepLinksMap);
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    };

    if (topic && slug) {
      fetchProject();
    }
  }, [topic, slug]);

  useEffect(() => {
    if (project) {
      // Save completion status to localStorage
      localStorage.setItem(
        `project-${project.canonical_id}-completed`,
        JSON.stringify(Array.from(completedChallenges))
      );
    }
  }, [completedChallenges, project]);

  const toggleChallenge = (challengeNumber: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedChallenges(prev => {
      const next = new Set(prev);
      if (next.has(challengeNumber)) {
        next.delete(challengeNumber);
      } else {
        next.add(challengeNumber);
      }
      return next;
    });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleChallengeCompletion = (challengeNumber: number) => {
    setCompletedChallenges(prev => {
      const next = new Set(prev);
      if (next.has(challengeNumber)) {
        next.delete(challengeNumber);
      } else {
        next.add(challengeNumber);
      }
      return next;
    });
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'very hard': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };


  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const progress = challenges.length > 0 
    ? Math.round((completedChallenges.size / challenges.length) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/projects/${topic}`}
        className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
      >
        ← Back to {topic.charAt(0).toUpperCase() + topic.slice(1)} Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-sm font-semibold ${getLevelColor(project.level)}`}>
              {project.level}
            </span>
            <span className="text-sm text-gray-500">
              ⏱️ {project.estimated_hours} hours
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {project.title}
        </h1>

        <p className="text-lg text-gray-600 mb-6">
          {project.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">{progress}% ({completedChallenges.size}/{challenges.length})</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {project.topics_covered && (
          <div>
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
          <MarkdownRenderer content={project.requirements} />
        </div>
      </div>

      {/* Prerequisites */}
      {project.prerequisites && project.prerequisites.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 Recommended Guides</h3>
          <p className="text-sm text-gray-600 mb-3">
            Review these guides before starting the project:
          </p>
          <div className="flex flex-wrap gap-2">
            {project.prerequisites.map((guideId, i) => {
              const guideLink = guideLinks[guideId];
              const href = guideLink?.url || `/read/${guideId}?knowledgebase=android`;
              const displayName = guideLink?.slug || guideId;
              
              return (
                <Link
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {displayName}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Challenges */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Challenges</h2>
        <div className="space-y-4">
          {challenges.map((challenge) => {
            const isExpanded = expandedChallenges.has(challenge.challenge_number);
            const isCompleted = completedChallenges.has(challenge.challenge_number);
            
            return (
              <div
                key={challenge.challenge_number}
                className="bg-white rounded-lg shadow-md border-2 transition-all"
                style={{
                  borderColor: isCompleted ? '#10b981' : isExpanded ? '#3b82f6' : '#e5e7eb'
                }}
              >
                {/* Challenge Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    // Don't toggle if clicking on checkbox
                    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                      return;
                    }
                    toggleChallenge(challenge.challenge_number, e);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg">
                          <svg
                            className={`w-5 h-5 text-gray-600 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                          Challenge {challenge.challenge_number}
                        </span>
                        <span className={`px-3 py-1 rounded text-xs font-semibold border ${getDifficultyColor(challenge.difficulty)}`}>
                          {challenge.difficulty}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 ml-11">
                        {challenge.challenge_title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm text-gray-500">
                        {challenge.steps.length} {challenge.steps.length === 1 ? 'step' : 'steps'}
                      </span>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => toggleChallengeCompletion(challenge.challenge_number)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {isCompleted ? 'Completed ✓' : 'Mark Complete'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Challenge Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 pt-4">
                    {challenge.steps && challenge.steps.length > 0 ? (
                      <div className="space-y-6">
                        {challenge.steps.map((step, stepIndex) => {
                        const stepId = `challenge-${challenge.challenge_number}-step-${step.number}`;
                        const isStepExpanded = expandedSteps.has(stepId);
                        
                        return (
                          <div
                            key={step.number}
                            className="border-l-4 border-blue-500 pl-6 pb-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                  {step.number % 100}
                                </span>
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                    {step.title}
                                  </h4>
                                  <p className="text-gray-600 text-sm">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                              {(step.code_examples || step.hints || step.guide_references) && (
                                <button
                                  onClick={() => toggleStep(stepId)}
                                  className="flex-shrink-0 ml-4 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  {isStepExpanded ? 'Hide Details' : 'Show Details'}
                                </button>
                              )}
                            </div>

                            {/* Step Details */}
                            {isStepExpanded && (
                              <div className="ml-11 mt-4 space-y-4">
                                {/* Code Examples */}
                                {step.code_examples && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Code Example:</h5>
                                    <CodeBlock code={step.code_examples} language="kotlin" />
                                  </div>
                                )}

                                {/* Hints */}
                                {step.hints && step.hints.length > 0 && (
                                  <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">💡 Hints:</h5>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                      {step.hints.map((hint, i) => (
                                        <li key={i}>{hint}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Guide References */}
                                {step.guide_references && step.guide_references.length > 0 && (
                                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">📖 Reference Guides:</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {step.guide_references.map((guideRef, i) => {
                                        const guideLink = stepGuideLinks[guideRef];
                                        const href = guideLink?.url || `/read/${guideRef}?knowledgebase=android`;
                                        const displayName = guideLink?.slug || guideRef;
                                        
                                        return (
                                          <Link
                                            key={i}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                                          >
                                            {displayName}
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No steps available for this challenge yet.</p>
                        <p className="text-sm mt-2">Check back later or refer to the project requirements above.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Summary */}
      {completedChallenges.size > 0 && (
        <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎉 Great Progress!
          </h3>
          <p className="text-gray-600">
            You&apos;ve completed {completedChallenges.size} out of {challenges.length} challenges. 
            Keep up the excellent work!
          </p>
        </div>
      )}
    </div>
  );
}
