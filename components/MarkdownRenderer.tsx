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
      const transformLinks = async () => {
        if (!contentRef.current) return;
        
        // Use requestAnimationFrame to ensure DOM is ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const links = contentRef.current.querySelectorAll('a[href]');
        const transformPromises = Array.from(links).map(async (linkElement) => {
          const link = linkElement as HTMLAnchorElement;
          const href = link.getAttribute('href');
          
          // Skip if already transformed or not a markdown link
          if (!href || href.startsWith('/read/') || (!href.endsWith('.md') && !href.includes('.md'))) {
            return;
          }
          
          // Skip if already processed (has data attribute)
          if (link.hasAttribute('data-link-transformed')) {
            return;
          }
          
          // Mark as being processed
          link.setAttribute('data-link-transformed', 'true');
          
          // Prevent navigation until link is transformed
          link.onclick = (e) => {
            e.preventDefault();
          };
          
          // Extract filename from href (handle relative paths like ./filename.md or ../path/filename.md)
          // Try to get the last part of the path that ends with .md
          const filenameMatch = href.match(/([^/]+)\.md(?:\?.*)?$/);
          if (filenameMatch) {
            let filename = decodeURIComponent(filenameMatch[1]);
            
            // Try multiple resolution strategies
            let resolved = false;
            const strategies = [
              // Strategy 1: Try exact filename
              filename,
              // Strategy 2: Try without number prefix (e.g., "05. Title" -> "Title")
              filename.replace(/^\d+\.\s*/, '').trim(),
              // Strategy 3: Try with just the main title part (remove prefixes/suffixes)
              filename.replace(/^\d+\.\s*/, '').replace(/\s*-\s*.*$/, '').trim(),
            ];
            
            // Remove duplicates
            const uniqueStrategies = [...new Set(strategies.filter(s => s.length > 0))];
            
            for (const strategy of uniqueStrategies) {
              if (resolved) break;
              
              try {
                const params = new URLSearchParams();
                params.set('filename', strategy);
                if (knowledgebase) {
                  params.set('knowledgebase', knowledgebase);
                }
                
                const res = await fetch(`/api/files/resolve?${params.toString()}`);
                if (res.ok) {
                  const data = await res.json();
                  const newHref = `/read/${data.slug}?knowledgebase=${data.knowledgebase}`;
                  link.setAttribute('href', newHref);
                  // Update click handler to use Next.js router for client-side navigation
                  link.onclick = (e) => {
                    e.preventDefault();
                    router.push(newHref);
                  };
                  // Remove disabled styling if it was applied
                  link.style.pointerEvents = '';
                  link.style.opacity = '';
                  link.style.cursor = '';
                  link.title = '';
                  resolved = true;
                }
              } catch (error) {
                // Continue to next strategy
                continue;
              }
            }
            
            if (!resolved) {
              // If all strategies fail, make it non-clickable but show helpful message
              console.warn(`Could not resolve file: ${filename} (tried: ${uniqueStrategies.join(', ')})`);
              link.style.pointerEvents = 'none';
              link.style.opacity = '0.5';
              link.style.cursor = 'not-allowed';
              link.title = `File not found: ${filename}`;
            }
          }
        });
        
        await Promise.all(transformPromises);
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

