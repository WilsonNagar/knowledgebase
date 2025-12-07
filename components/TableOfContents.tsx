'use client';

import { useState } from 'react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TOCItem[];
}

interface TOCNode extends TOCItem {
  children: TOCNode[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  // Build hierarchical structure
  const buildTree = (items: TOCItem[]): TOCNode[] => {
    const root: TOCNode[] = [];
    const stack: TOCNode[] = [];

    items.forEach((item) => {
      const node: TOCNode = { ...item, children: [] };

      // Find the appropriate parent
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }

      stack.push(node);
    });

    return root;
  };

  const tree = buildTree(items);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (node: TOCNode, index: number): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedItems.has(node.id);

    return (
      <div key={`${node.id}-${index}`} className="select-none">
        <div className="flex items-center group">
          {hasChildren && (
            <button
              onClick={(e) => toggleExpand(node.id, e)}
              className="mr-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {!hasChildren && <span className="w-4 mr-1" />}
          <a
            href={`#${node.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick(node.id);
            }}
            className={`flex-1 text-sm text-gray-600 hover:text-blue-600 transition-colors ${
              node.level === 1 ? 'font-semibold' : ''
            }`}
          >
            {node.text}
          </a>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {node.children.map((child, childIndex) => renderNode(child, childIndex))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
      <nav className="space-y-1">
        {tree.map((node, index) => renderNode(node, index))}
      </nav>
    </div>
  );
}

