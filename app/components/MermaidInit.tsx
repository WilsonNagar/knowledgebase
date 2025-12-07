'use client';

import { useEffect } from 'react';

export default function MermaidInit() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const initMermaid = async () => {
      try {
        const mermaid = await import('mermaid');
        const mermaidInstance = mermaid.default;
        
        // Initialize Mermaid
        mermaidInstance.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
        });
        
        // Function to render all Mermaid diagrams
        const renderMermaidDiagrams = async () => {
          // Wait a bit for React to finish rendering
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Filter to only process elements that are actually in the DOM
          const allMermaidElements = document.querySelectorAll('.mermaid');
          const mermaidElements = Array.from(allMermaidElements).filter(
            el => !el.hasAttribute('data-processed') && el.isConnected
          );
          
          if (mermaidElements.length === 0) {
            // Debug: check if there are any .mermaid elements at all
            console.log(`No unprocessed Mermaid elements found. Total .mermaid elements: ${allMermaidElements.length}`);
            if (allMermaidElements.length > 0) {
              allMermaidElements.forEach((el, i) => {
                console.log(`Mermaid element ${i}:`, {
                  processed: el.hasAttribute('data-processed'),
                  inDOM: el.isConnected,
                  innerHTML: el.innerHTML.substring(0, 100),
                  textContent: el.textContent?.substring(0, 50),
                });
              });
            }
            return;
          }
          
          console.log(`Found ${mermaidElements.length} Mermaid diagrams to render (all in DOM)`);
          mermaidElements.forEach((el, i) => {
            console.log(`Mermaid element ${i} before processing:`, {
              inDOM: el.isConnected,
              innerHTML: el.innerHTML.substring(0, 200),
              textContent: el.textContent?.substring(0, 100),
              className: el.className,
            });
          });
          
          // Use Promise.all to wait for all renders to complete
          // Only process elements that are in the DOM
          await Promise.all(
            mermaidElements.map(async (element, index) => {
              // Double-check element is still in DOM before processing
              if (!element.isConnected) {
                console.warn(`Element ${index} is not in DOM, skipping`);
                return;
              }
              
              // Get a unique identifier for this element BEFORE any async operations
              const elementId = element.id || `mermaid-container-${index}-${Date.now()}`;
              if (!element.id) {
                element.id = elementId;
              }
              
              // Get the code from the element NOW, before any async operations
              let code = element.textContent || (element as HTMLElement).innerText || '';
              
              // Remove any HTML tags that might have been inserted
              code = code.replace(/<[^>]*>/g, '');
              
              // Clean up the code - remove any HTML entities and extra whitespace
              code = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .trim();
              
              // Remove any content after common Mermaid endings that might have leaked in
              const mermaidEndPatterns = [
                /(```[\s\S]*?```)/,
                /(<\/div>[\s\S]*)/,
                /(<[^>]+>[\s\S]*)/,
              ];
              
              for (const pattern of mermaidEndPatterns) {
                const match = code.match(pattern);
                if (match && match.index !== undefined && match.index > 0) {
                  code = code.substring(0, match.index).trim();
                  console.warn(`Truncated Mermaid code at index ${match.index} to remove mixed content`);
                  break;
                }
              }
              
              if (!code) {
                console.warn('No code found in Mermaid element:', element);
                return;
              }
              
              // Mark as processing (not processed yet)
              element.setAttribute('data-processing', 'true');
              
              try {
                const renderId = `mermaid-${index}-${Date.now()}`;
                
                // If the element has innerHTML that looks like it was already processed, skip
                if (element.innerHTML.includes('<svg') || (element.innerHTML.includes('mermaid') && element.innerHTML.includes('svg'))) {
                  console.log('Skipping already processed diagram');
                  element.removeAttribute('data-processing');
                  return;
                }
              
                console.log(`Rendering Mermaid diagram ${index + 1}:`, code.substring(0, 100) + '...');
                
                // Use the new render API (returns Promise with svg)
                const result = await mermaidInstance.render(renderId, code);
                console.log('Mermaid render result:', result);
                
                // The result might be an object with svg property, or just the svg string
                const svg = typeof result === 'string' ? result : result.svg || result.toString();
                
                if (!svg || svg.trim().length === 0) {
                  console.error('Empty SVG returned from Mermaid render');
                  return;
                }
                
                console.log(`SVG length: ${svg.length}, first 200 chars:`, svg.substring(0, 200));
                
                // Re-query for the element by ID to get a fresh reference (React may have re-rendered)
                let currentElement = document.getElementById(elementId) as HTMLElement | null;
                
                if (!currentElement) {
                  // Fallback: try to find by class and index
                  const allMermaidElements = document.querySelectorAll('.mermaid');
                  if (index < allMermaidElements.length) {
                    currentElement = allMermaidElements[index] as HTMLElement;
                  }
                }
                
                if (!currentElement) {
                  console.error(`Could not find element with ID ${elementId} after render. Element may have been removed by React.`);
                  return;
                }
                
                // Check if element is in the DOM
                const isInDOM = currentElement.isConnected;
                const parentElement = currentElement.parentElement;
                console.log(`Element is in DOM: ${isInDOM}, parent:`, parentElement?.tagName, parentElement?.className);
                
                if (!isInDOM) {
                  console.error('Element is not in the DOM! Cannot render.');
                  element.removeAttribute('data-processing');
                  return;
                }
                
                // Update the element reference to the fresh one
                element = currentElement;
              
              // Check parent's computed styles
              if (parentElement) {
                const parentStyle = window.getComputedStyle(parentElement);
                console.log(`Parent styles:`, {
                  display: parentStyle.display,
                  visibility: parentStyle.visibility,
                  width: parentStyle.width,
                  height: parentStyle.height,
                });
              }
              
                // Mark as processed (remove processing flag, add processed flag)
                element.removeAttribute('data-processing');
                element.setAttribute('data-processed', 'true');
                
                // Clear any existing content and set the SVG
                element.innerHTML = svg;
                
                // Ensure the element is visible and has proper styling
                if (element instanceof HTMLElement) {
                  // Don't override display if it's already set, but ensure visibility
                  if (!element.style.display || element.style.display === 'none') {
                    element.style.display = 'block';
                  }
                  element.style.visibility = 'visible';
                  element.style.width = '100%';
                  element.style.minHeight = '1px'; // Ensure it has some height
                  element.style.overflow = 'visible';
                  // Ensure it has the mermaid class for styling
                  if (!element.classList.contains('mermaid')) {
                    element.classList.add('mermaid');
                  }
                }
              
              // Get the SVG element and ensure it's visible
              const svgElement = element.querySelector('svg');
              if (svgElement) {
                svgElement.style.display = 'block';
                svgElement.style.visibility = 'visible';
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                // Ensure SVG has explicit dimensions
                if (!svgElement.getAttribute('width') || svgElement.getAttribute('width') === '0') {
                  svgElement.setAttribute('width', '100%');
                }
                console.log(`SVG element found: width=${svgElement.getAttribute('width')}, viewBox=${svgElement.getAttribute('viewBox')}`);
              } else {
                console.warn('SVG element not found in container after insertion!');
              }
              
              // Force a reflow to ensure styles are applied
              void (element as HTMLElement).offsetHeight;
              
              // Verify it was inserted and check element position
              const rect = (element as HTMLElement).getBoundingClientRect();
              const computedStyle = window.getComputedStyle(element as HTMLElement);
              
              console.log(`Element innerHTML length after insert: ${element.innerHTML.length}`);
              console.log(`Element has SVG: ${element.innerHTML.includes('<svg')}`);
              console.log(`Element position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
              console.log(`Element computed styles:`, {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                width: computedStyle.width,
                height: computedStyle.height,
                overflow: computedStyle.overflow,
                position: computedStyle.position,
              });
              console.log(`Element is in viewport: ${rect.width > 0 && rect.height > 0}`);
              
              // If element has zero dimensions, try to fix it
              if (rect.width === 0 || rect.height === 0) {
                console.warn('Element has zero dimensions, attempting to fix...');
                // Try setting explicit dimensions based on SVG viewBox
                if (svgElement) {
                  const viewBox = svgElement.getAttribute('viewBox');
                  if (viewBox) {
                    const [, , width, height] = viewBox.split(' ').map(Number);
                    if (width && height) {
                      const aspectRatio = height / width;
                      // Set a minimum width and calculate height
                      (element as HTMLElement).style.minWidth = '400px';
                      (element as HTMLElement).style.minHeight = `${400 * aspectRatio}px`;
                      console.log(`Set explicit dimensions: 400px x ${400 * aspectRatio}px`);
                    }
                  }
                }
              }
              
              // Double-check after a short delay to see if it persists and has dimensions
              setTimeout(() => {
                const stillHasSvg = element.innerHTML.includes('<svg');
                const stillInDOM = element.isConnected;
                const newRect = (element as HTMLElement).getBoundingClientRect();
                console.log(`After 500ms - Has SVG: ${stillHasSvg}, In DOM: ${stillInDOM}, Size: ${newRect.width}x${newRect.height}`);
                if (!stillHasSvg) {
                  console.error('SVG was removed from element!');
                }
                if (!stillInDOM) {
                  console.error('Element was removed from DOM!');
                }
                if (newRect.width === 0 || newRect.height === 0) {
                  console.warn('Element still has zero dimensions after 500ms');
                }
              }, 500);
              
              console.log(`Successfully rendered Mermaid diagram ${index + 1}`);
              } catch (err) {
                console.error('Error rendering Mermaid diagram:', err);
                console.error('Mermaid code that failed:', code);
                
                // Extract more detailed error information
                let errorMessage = 'Unknown error';
                if (err instanceof Error) {
                  errorMessage = err.message;
                } else if (typeof err === 'string') {
                  errorMessage = err;
                } else if (err && typeof err === 'object' && 'message' in err) {
                  errorMessage = String(err.message);
                }
                
                // Show error message in the element with better formatting
                element.innerHTML = `<div style="padding: 1rem; border: 1px solid #ef4444; border-radius: 0.25rem; color: #dc2626; background-color: #fef2f2;">
                  <div style="font-weight: 600; margin-bottom: 0.5rem;">⚠️ Mermaid Diagram Error</div>
                  <div style="margin-bottom: 0.5rem; font-size: 0.875rem;">${errorMessage}</div>
                  <details style="margin-top: 0.5rem;">
                    <summary style="cursor: pointer; font-size: 0.875rem; color: #991b1b;">Show diagram code</summary>
                    <pre style="margin-top: 0.5rem; font-size: 0.75rem; overflow-x: auto; white-space: pre-wrap; background: #fee2e2; padding: 0.5rem; border-radius: 0.25rem;">${code || element.textContent || 'No content'}</pre>
                  </details>
                </div>`;
                // Mark as processed even if it failed to avoid retrying
                element.setAttribute('data-processed', 'true');
              }
            })
          );
        };
        
        // Wait for DOM to be ready, then render
        const startRendering = () => {
          // Wait longer to ensure React has finished rendering the content
          // Use requestAnimationFrame to wait for next paint cycle
          requestAnimationFrame(() => {
            setTimeout(() => {
              renderMermaidDiagrams();
            }, 300);
          });
        };
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startRendering);
        } else {
          startRendering();
        }
        
        // Also try rendering after a longer delay in case content loads asynchronously
        setTimeout(() => {
          renderMermaidDiagrams();
        }, 1000);
        
        // Also watch for dynamically added content (with debouncing)
        // But only watch for NEW mermaid elements, not changes to existing ones
        let renderTimeout: NodeJS.Timeout;
        const observer = new MutationObserver((mutations) => {
          // Only trigger if new .mermaid elements are added
          const hasNewMermaidElements = mutations.some(mutation => {
            return Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                return el.classList?.contains('mermaid') || el.querySelector?.('.mermaid');
              }
              return false;
            });
          });
          
          if (hasNewMermaidElements) {
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
              renderMermaidDiagrams();
            }, 500);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
        
        // Cleanup
        return () => {
          observer.disconnect();
        };
      } catch (error) {
        console.error('Error loading Mermaid:', error);
      }
    };
    
    initMermaid();
  }, []);

  return null;
}

