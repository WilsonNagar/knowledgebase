'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMarkdown, extractTableOfContents } from '@/lib/markdown';
import { useRouter } from 'next/navigation';

interface MarkdownRendererProps {
  content: string;
  onTOCUpdate?: (toc: Array<{ id: string; text: string; level: number }>) => void;
  knowledgebase?: string;
}

export default function MarkdownRenderer({ content, onTOCUpdate, knowledgebase }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  const [toc, setToc] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

      // Transform relative .md links to proper Next.js routes
      const links = contentRef.current.querySelectorAll('a[href]');
      const transformLinks = async () => {
        for (const link of links) {
          const href = (link as HTMLAnchorElement).getAttribute('href');
          if (href && (href.endsWith('.md') || href.includes('.md'))) {
            // Prevent navigation until link is transformed
            (link as HTMLAnchorElement).onclick = (e) => {
              e.preventDefault();
            };
            
            // Extract filename from href (handle relative paths like ./filename.md or ../path/filename.md)
            const filenameMatch = href.match(/([^/]+)\.md/);
            if (filenameMatch) {
              const filename = decodeURIComponent(filenameMatch[1]);
              try {
                const params = new URLSearchParams();
                params.set('filename', filename);
                if (knowledgebase) {
                  params.set('knowledgebase', knowledgebase);
                }
                
                const res = await fetch(`/api/files/resolve?${params.toString()}`);
                if (res.ok) {
                  const data = await res.json();
                  const newHref = `/read/${data.slug}?knowledgebase=${data.knowledgebase}`;
                  (link as HTMLAnchorElement).setAttribute('href', newHref);
                  // Update click handler to use Next.js router for client-side navigation
                  (link as HTMLAnchorElement).onclick = (e) => {
                    e.preventDefault();
                    router.push(newHref);
                  };
                } else {
                  // If resolution fails, make it non-clickable
                  console.warn(`Could not resolve file: ${filename}`);
                  (link as HTMLAnchorElement).style.pointerEvents = 'none';
                  (link as HTMLAnchorElement).style.opacity = '0.5';
                  (link as HTMLAnchorElement).title = `File not found: ${filename}`;
                }
              } catch (error) {
                console.error(`Error resolving file ${filename}:`, error);
                (link as HTMLAnchorElement).style.pointerEvents = 'none';
                (link as HTMLAnchorElement).style.opacity = '0.5';
                (link as HTMLAnchorElement).title = `Error resolving file: ${filename}`;
              }
            }
          }
        }
      };
      transformLinks();
    }
  }, [html, knowledgebase, router]);

  return (
    <div
      ref={contentRef}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

