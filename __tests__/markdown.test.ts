import { renderMarkdown, extractTableOfContents } from '../lib/markdown';

describe('Markdown utilities', () => {
  describe('extractTableOfContents', () => {
    it('should extract headings from markdown', () => {
      const content = `# Title

## Section 1

### Subsection 1.1

## Section 2
`;

      const toc = extractTableOfContents(content);
      
      expect(toc).toHaveLength(3);
      expect(toc[0]).toEqual({
        id: 'title',
        text: 'Title',
        level: 1,
      });
      expect(toc[1]).toEqual({
        id: 'section-1',
        text: 'Section 1',
        level: 2,
      });
    });

    it('should handle special characters in headings', () => {
      const content = `## C++ & Android`;
      const toc = extractTableOfContents(content);
      
      expect(toc[0].id).toBe('c-android');
    });
  });

  describe('renderMarkdown', () => {
    it('should render basic markdown', async () => {
      const content = `# Title

This is a paragraph with **bold** text.`;
      
      const html = await renderMarkdown(content);
      
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>');
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should convert Mermaid code blocks', async () => {
      const content = `\`\`\`mermaid
graph TB
    A --> B
\`\`\``;
      
      const html = await renderMarkdown(content);
      
      expect(html).toContain('class="mermaid"');
      expect(html).toContain('graph TB');
    });

    it('should highlight code blocks', async () => {
      const content = `\`\`\`kotlin
fun hello() {
    println("Hello")
}
\`\`\``;
      
      const html = await renderMarkdown(content);
      
      expect(html).toContain('<pre>');
      expect(html).toContain('<code');
    });
  });
});


