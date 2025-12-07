'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMarkdown, extractTableOfContents } from '@/lib/markdown';

interface MarkdownRendererProps {
  content: string;
  onTOCUpdate?: (toc: Array<{ id: string; text: string; level: number }>) => void;
}

export default function MarkdownRenderer({ content, onTOCUpdate }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  const [toc, setToc] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processContent = async () => {
      const extractedToc = extractTableOfContents(content);
      setToc(extractedToc);
      onTOCUpdate?.(extractedToc);
      
      const rendered = await renderMarkdown(content);
      setHtml(rendered);
    };
    
    processContent();
  }, [content, onTOCUpdate]);

  useEffect(() => {
    if (contentRef.current) {
      // Copy buttons for code blocks
      const codeBlocks = contentRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        const pre = block.parentElement;
        if (pre && !pre.querySelector('.copy-button')) {
          const button = document.createElement('button');
          button.className = 'copy-button absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600';
          button.textContent = 'Copy';
          button.onclick = () => {
            navigator.clipboard.writeText(block.textContent || '');
            button.textContent = 'Copied!';
            setTimeout(() => {
              button.textContent = 'Copy';
            }, 2000);
          };
          pre.style.position = 'relative';
          pre.appendChild(button);
        }
      });
    }
  }, [html]);

  return (
    <div
      ref={contentRef}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

