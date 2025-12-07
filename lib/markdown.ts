import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';

export async function renderMarkdown(content: string): Promise<string> {
  // Extract Mermaid blocks first and store them with unique placeholders
  const mermaidBlocks: Array<{ placeholder: string; code: string }> = [];
  
  // More precise regex to capture Mermaid blocks - ensure we match the closing ```
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```\s*\n?/g;
  let processedContent = content.replace(mermaidRegex, (match, diagram) => {
    const code = diagram.trim();
    // Use an HTML comment as placeholder - it won't be processed as markdown
    const placeholder = `<!--MERMAID_PLACEHOLDER_${mermaidBlocks.length}-->`;
    mermaidBlocks.push({ placeholder, code });
    // Return placeholder with newlines to maintain structure
    return `\n\n${placeholder}\n\n`;
  });
  
  // Custom plugin to ensure heading IDs match TOC format and handle duplicates
  const rehypeCustomHeadingIds = () => {
    return (tree: Root) => {
      const idCounts = new Map<string, number>();
      
      visit(tree, 'element', (node) => {
        if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
          const level = parseInt(node.tagName[1]);
          const text = extractTextFromNode(node);
          let id = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          
          // Handle duplicates the same way as TOC extraction
          const count = idCounts.get(id) || 0;
          idCounts.set(id, count + 1);
          if (count > 0) {
            id = `${id}-${count}`;
          }
          
          node.properties = node.properties || {};
          node.properties.id = id;
        }
      });
    };
  };
  
  const extractTextFromNode = (node: any): string => {
    if (node.type === 'text') {
      return node.value;
    }
    if (node.children) {
      return node.children.map(extractTextFromNode).join('');
    }
    return '';
  };
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeCustomHeadingIds)
    .use(rehypeHighlight)
    .use(rehypeStringify);
  
  let html = (await processor.process(processedContent)).toString();
  
  // Replace placeholders with actual Mermaid divs after markdown processing
  // HTML comments should be preserved by rehype-raw, so they should appear in the output
  mermaidBlocks.forEach(({ placeholder, code }) => {
    // Escape the placeholder for regex (HTML comments have special chars)
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // HTML comments should appear as-is in the HTML output
    // Replace the comment with the Mermaid div
    html = html.replace(
      new RegExp(escapedPlaceholder, 'g'),
      `<div class="mermaid">${code}</div>`
    );
    
    // Also try patterns in case the comment got wrapped in other tags
    html = html.replace(
      new RegExp(`<p>\\s*${escapedPlaceholder}\\s*</p>`, 'gi'),
      `<div class="mermaid">${code}</div>`
    );
    
    html = html.replace(
      new RegExp(`<h[1-6][^>]*>\\s*${escapedPlaceholder}\\s*</h[1-6]>`, 'gi'),
      `<div class="mermaid">${code}</div>`
    );
  });
  
  // Debug: Log if any placeholders remain
  mermaidBlocks.forEach(({ placeholder }) => {
    if (html.includes(placeholder)) {
      console.warn(`Placeholder ${placeholder} was not replaced in HTML output`);
    }
  });
  
  return html;
}

export function extractTableOfContents(content: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = [];
  const lines = content.split('\n');
  const idCounts = new Map<string, number>();
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      let id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Make IDs unique by appending a number if duplicate
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) {
        id = `${id}-${count}`;
      }
      
      headings.push({ id, text, level });
    }
  }
  
  return headings;
}

