'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Roadmap from '@/components/Roadmap';
import { Roadmap as RoadmapType } from '@/types';

function RoadmapContent() {
  const searchParams = useSearchParams();
  const knowledgebase = searchParams.get('knowledgebase') || 'android';
  const topic = searchParams.get('topic');
  const [roadmap, setRoadmap] = useState<RoadmapType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('knowledgebase', knowledgebase);
        if (topic) {
          params.set('topic', topic);
        }
        
        const res = await fetch(`/api/roadmap?${params.toString()}`);
        const data = await res.json();
        setRoadmap(data.roadmap);
      } catch (error) {
        console.error('Error fetching roadmap:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [knowledgebase, topic]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading roadmap...</div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">No roadmap data available</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {topic 
            ? `${topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Roadmap`
            : `${knowledgebase.charAt(0).toUpperCase() + knowledgebase.slice(1)} Roadmap`
          }
        </h1>
        <p className="text-gray-600">
          Interactive learning path showing the recommended order to learn topics
        </p>
      </div>
      
      <Roadmap roadmap={roadmap} compact={false} />
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading roadmap...</div>
      </div>
    }>
      <RoadmapContent />
    </Suspense>
  );
}

