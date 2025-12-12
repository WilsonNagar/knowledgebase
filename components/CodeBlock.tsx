'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = '' }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState('');
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const highlight = async () => {
      // Wrap code in markdown code block for highlighting
      const markdownCode = `\`\`\`${language}\n${code}\n\`\`\``;
      const html = await renderMarkdown(markdownCode);
      setHighlightedCode(html);
    };
    
    highlight();
  }, [code, language]);

  return (
    <div className="relative group">
      <div
        ref={codeRef}
        className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: highlightedCode || `<pre><code>${code}</code></pre>` }}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
        }}
        className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        Copy
      </button>
    </div>
  );
}

