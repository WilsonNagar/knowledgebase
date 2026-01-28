'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KnowledgeFile, KnowledgeBaseMetadata } from '@/types';

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const level = searchParams.get('level');
  const knowledgebase = searchParams.get('knowledgebase') || '';
  const topic = searchParams.get('topic');
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [knowledgebases, setKnowledgebases] = useState<KnowledgeBaseMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readStatuses, setReadStatuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch knowledge bases
        const kbRes = await fetch('/api/index');
        const kbData = await kbRes.json();
        setKnowledgebases(kbData.knowledgebases || []);
        
        // Fetch files
        const params = new URLSearchParams();
        if (level) params.set('level', level);
        if (knowledgebase) params.set('knowledgebase', knowledgebase);
        if (topic) params.set('topic', topic);
        
        const res = await fetch(`/api/files?${params.toString()}`);
        const data = await res.json();
        setFiles(data.files || []);
        
        // Load read statuses from localStorage
        if (typeof window !== 'undefined' && data.files) {
          const readSet = new Set<string>();
          data.files.forEach((file: KnowledgeFile) => {
            if (localStorage.getItem(`read-${file.canonical_id}`) === 'true') {
              readSet.add(file.canonical_id);
            }
          });
          setReadStatuses(readSet);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [level, knowledgebase, topic]);

  // Refresh read statuses when files change or component mounts
  useEffect(() => {
    if (typeof window === 'undefined' || files.length === 0) return;
    
    const refreshReadStatuses = () => {
      const readSet = new Set<string>();
      files.forEach((file: KnowledgeFile) => {
        if (localStorage.getItem(`read-${file.canonical_id}`) === 'true') {
          readSet.add(file.canonical_id);
        }
      });
      setReadStatuses(readSet);
    };
    
    refreshReadStatuses();
    
    // Also refresh when window gains focus (user navigates back)
    const handleFocus = () => {
      refreshReadStatuses();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [files]);

  // Listen for storage changes (e.g., when marked as read in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = () => {
      if (files.length > 0) {
        const readSet = new Set<string>();
        files.forEach((file: KnowledgeFile) => {
          if (localStorage.getItem(`read-${file.canonical_id}`) === 'true') {
            readSet.add(file.canonical_id);
          }
        });
        setReadStatuses(readSet);
      }
    };

    // Listen for visibility change (when user navigates back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleStorageChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('readStatusChanged', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('readStatusChanged', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [files]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      if (level) params.set('level', level);
      if (knowledgebase) params.set('knowledgebase', knowledgebase);
      
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setFiles(data.files || []);
      
      // Load read statuses from localStorage
      if (typeof window !== 'undefined' && data.files) {
        const readSet = new Set<string>();
        data.files.forEach((file: KnowledgeFile) => {
          if (localStorage.getItem(`read-${file.canonical_id}`) === 'true') {
            readSet.add(file.canonical_id);
          }
        });
        setReadStatuses(readSet);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
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

  const buildBrowseUrl = (levelParam?: string | null, kbParam?: string | null) => {
    const params = new URLSearchParams();
    if (levelParam) {
      params.set('level', levelParam);
    }
    const kb = kbParam !== undefined ? kbParam : knowledgebase;
    if (kb) {
      params.set('knowledgebase', kb);
    }
    if (topic) {
      params.set('topic', topic);
    }
    return `/browse?${params.toString()}`;
  };

  const handleKnowledgeBaseChange = (kb: string) => {
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (kb) params.set('knowledgebase', kb);
    if (topic) params.set('topic', topic);
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {topic 
            ? `Browse ${topic.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
            : 'Browse Knowledge Base'
          }
        </h1>
        
        {/* Knowledge Base Selector */}
        {!topic && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Knowledge Base
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleKnowledgeBaseChange('')}
                className={`px-4 py-2 rounded-lg ${
                  !knowledgebase 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {knowledgebases.map((kb) => (
                <button
                  key={kb.name}
                  onClick={() => handleKnowledgeBaseChange(kb.name)}
                  className={`px-4 py-2 rounded-lg ${
                    knowledgebase === kb.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {kb.name === 'android' ? 'Android' :
                   kb.name === 'devops' ? 'DevOps' :
                   kb.name === 'backend' ? 'Backend' :
                   kb.name === 'golang' ? 'Go' :
                   kb.name === 'aosp' ? 'AOSP' :
                   kb.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="flex gap-2 flex-wrap mb-4">
          <Link
            href={buildBrowseUrl(null)}
            className={`px-4 py-2 rounded-lg ${
              !level ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Levels
          </Link>
          <Link
            href={buildBrowseUrl('beginner')}
            className={`px-4 py-2 rounded-lg ${
              level === 'beginner' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Beginner
          </Link>
          <Link
            href={buildBrowseUrl('intermediate')}
            className={`px-4 py-2 rounded-lg ${
              level === 'intermediate' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Intermediate
          </Link>
          <Link
            href={buildBrowseUrl('advanced')}
            className={`px-4 py-2 rounded-lg ${
              level === 'advanced' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Advanced
          </Link>
          <Link
            href={buildBrowseUrl('overachiever')}
            className={`px-4 py-2 rounded-lg ${
              level === 'overachiever' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overachiever
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No files found. {searchQuery && 'Try a different search query.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => {
            const isRead = readStatuses.has(file.canonical_id);
            return (
              <Link
                key={file.canonical_id}
                href={`/read/${file.slug}?knowledgebase=${file.knowledgebase || knowledgebase}`}
                className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative ${
                  isRead 
                    ? 'bg-green-50 border-2 border-green-200' 
                    : 'bg-white'
                }`}
              >
                {isRead && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white flex items-center gap-1">
                      <span>✓</span> Completed
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-mono text-gray-500">
                    #{file.number}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(file.level)}`}>
                    {file.level}
                  </span>
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${
                  isRead ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {file.title}
                </h2>
                <p className={`text-sm mb-4 line-clamp-2 ${
                  isRead ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {file.content.substring(0, 150)}...
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>⏱️ {file.estimated_minutes} min</span>
                  {file.tags && (
                    <div className="flex gap-1 flex-wrap">
                      {file.tags.split(',').slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="text-center py-12">Loading...</div></div>}>
      <BrowseContent />
    </Suspense>
  );
}



