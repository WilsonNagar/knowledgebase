'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TableOfContents from '@/components/TableOfContents';
import Quiz from '@/components/Quiz';
import { KnowledgeFile } from '@/types';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function ReadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const knowledgebase = searchParams.get('knowledgebase') || 'android';
  
  const [file, setFile] = useState<KnowledgeFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchFile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/files/${slug}?knowledgebase=${knowledgebase}`);
        const data = await res.json();
        setFile(data.file);
        
        // Extract quiz from content
        const quizMatch = data.file.content.match(/## Quiz\s+([\s\S]*?)(?=\n## |$)/);
        if (quizMatch) {
          const quizContent = quizMatch[1];
          const questions = parseQuiz(quizContent);
          setQuizQuestions(questions);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [slug, knowledgebase]);

  const parseQuiz = (content: string) => {
    const questions: any[] = [];
    const questionBlocks = content.split(/### Question \d+/).slice(1);
    
    questionBlocks.forEach((block) => {
      const lines = block.trim().split('\n');
      const question = lines[0]?.replace(/^[^:]+:\s*/, '') || '';
      const options: string[] = [];
      let answer = '';
      let explanation = '';
      
      let inOptions = false;
      let inAnswer = false;
      let inExplanation = false;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\*\*[A-D]\*\*/)) {
          inOptions = true;
          const optionText = line.replace(/^\*\*[A-D]\*\*\s*/, '');
          options.push(optionText);
        } else if (line.match(/^\*\*Answer:/)) {
          inAnswer = true;
          answer = line.match(/Answer:\s*([A-D])/)?.[1] || '';
        } else if (line.match(/^\*\*Explanation:/) || line.includes('Explanation:')) {
          inExplanation = true;
          explanation = line.replace(/.*Explanation:\s*/, '');
        } else if (inExplanation && line) {
          explanation += ' ' + line;
        }
      }
      
      if (question && options.length > 0 && answer) {
        questions.push({ question, options, answer, explanation });
      }
    });
    
    return questions;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">File not found</h1>
          <Link href="/browse" className="text-blue-600 hover:text-blue-800">
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'overachiever': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/browse"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Browse
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <span className={`px-3 py-1 rounded text-sm font-semibold ${getLevelColor(file.level)}`}>
            {file.level}
          </span>
          <span className="text-sm text-gray-500">
            ⏱️ {file.estimated_minutes} min read
          </span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{file.title}</h1>
        {file.tags && (
          <div className="flex gap-2 flex-wrap">
            {file.tags.split(',').map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-8">
            <MarkdownRenderer
              content={file.content}
              onTOCUpdate={setToc}
            />
          </div>
          
          {quizQuestions.length > 0 && (
            <Quiz questions={quizQuestions} />
          )}
        </div>

        <div className="lg:col-span-1">
          <TableOfContents items={toc} />
          
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Mark as Learned
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Add Note
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Bookmark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



