'use client';

import { useState } from 'react';
import { FrontMatter } from '@/types';

export default function AdminPage() {
  const [frontmatter, setFrontmatter] = useState<FrontMatter>({
    number: 1,
    title: '',
    slug: '',
    level: 'beginner',
    tags: [],
    prerequisites: [],
    estimated_minutes: 30,
    contributors: [],
    canonical_id: '',
  });
  const [content, setContent] = useState('');
  const [knowledgebase, setKnowledgebase] = useState('android');
  const [levelFolder, setLevelFolder] = useState('01_beginners');
  const [mode, setMode] = useState<'wysiwyg' | 'raw'>('raw');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleFrontmatterChange = (field: keyof FrontMatter, value: any) => {
    setFrontmatter({ ...frontmatter, [field]: value });
  };

  const handleCheckDuplicate = async () => {
    try {
      const res = await fetch('/api/admin/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, content, knowledgebase }),
      });
      const data = await res.json();
      setDuplicateCheck(data);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const handleSave = async () => {
    setValidationErrors([]);
    setSaving(true);

    // Validation
    const errors: string[] = [];
    if (!frontmatter.title.trim()) errors.push('Title is required');
    if (!frontmatter.slug.trim()) errors.push('Slug is required');
    if (!frontmatter.canonical_id.trim()) errors.push('Canonical ID is required');
    if (!content.trim()) errors.push('Content is required');
    if (frontmatter.number < 1) errors.push('Number must be at least 1');

    if (errors.length > 0) {
      setValidationErrors(errors);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontmatter,
          content,
          knowledgebase,
          levelFolder,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('File created successfully!');
        // Reset form
        setFrontmatter({
          number: 1,
          title: '',
          slug: '',
          level: 'beginner',
          tags: [],
          prerequisites: [],
          estimated_minutes: 30,
          contributors: [],
          canonical_id: '',
        });
        setContent('');
      } else {
        setValidationErrors([data.error || 'Failed to create file']);
        if (data.similarFiles) {
          setDuplicateCheck(data);
        }
      }
    } catch (error: any) {
      setValidationErrors([error.message || 'Failed to create file']);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = prompt('Enter tag:');
    if (tag) {
      handleFrontmatterChange('tags', [...frontmatter.tags, tag]);
    }
  };

  const removeTag = (index: number) => {
    handleFrontmatterChange(
      'tags',
      frontmatter.tags.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin - Create New File</h1>

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Validation Errors:</h3>
          <ul className="list-disc list-inside text-red-700">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicateCheck && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Duplicate Check Results:</h3>
          {duplicateCheck.duplicateCanonicalId && (
            <p className="text-yellow-700">⚠️ Canonical ID already exists</p>
          )}
          {duplicateCheck.duplicateSlug && (
            <p className="text-yellow-700">⚠️ Slug already exists in this knowledgebase</p>
          )}
          {duplicateCheck.similarFiles && duplicateCheck.similarFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-yellow-700 font-semibold">Similar files found:</p>
              <ul className="list-disc list-inside text-yellow-700">
                {duplicateCheck.similarFiles.map((f: any, i: number) => (
                  <li key={i}>
                    {f.title} (similarity: {(f.similarity * 100).toFixed(1)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Frontmatter</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Knowledge Base
                </label>
                <select
                  value={knowledgebase}
                  onChange={(e) => setKnowledgebase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="android">Android</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level Folder
                </label>
                <select
                  value={levelFolder}
                  onChange={(e) => setLevelFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="01_beginners">01_beginners</option>
                  <option value="02_intermediate">02_intermediate</option>
                  <option value="03_advanced">03_advanced</option>
                  <option value="04_overachiever">04_overachiever</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number *
                </label>
                <input
                  type="number"
                  value={frontmatter.number}
                  onChange={(e) => handleFrontmatterChange('number', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={frontmatter.title}
                  onChange={(e) => {
                    handleFrontmatterChange('title', e.target.value);
                    if (!frontmatter.slug) {
                      handleFrontmatterChange(
                        'slug',
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')
                      );
                    }
                    if (!frontmatter.canonical_id) {
                      handleFrontmatterChange(
                        'canonical_id',
                        `android-${String(frontmatter.number).padStart(2, '0')}`
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={frontmatter.slug}
                  onChange={(e) => handleFrontmatterChange('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Canonical ID *
                </label>
                <input
                  type="text"
                  value={frontmatter.canonical_id}
                  onChange={(e) => handleFrontmatterChange('canonical_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level *
                </label>
                <select
                  value={frontmatter.level}
                  onChange={(e) => handleFrontmatterChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="overachiever">Overachiever</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Minutes
                </label>
                <input
                  type="number"
                  value={frontmatter.estimated_minutes}
                  onChange={(e) => handleFrontmatterChange('estimated_minutes', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {frontmatter.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(i)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={addTag}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Tag
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prerequisites (comma-separated numbers or slugs)
                </label>
                <input
                  type="text"
                  value={frontmatter.prerequisites.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value
                      .split(',')
                      .map(v => v.trim())
                      .filter(v => v);
                    handleFrontmatterChange('prerequisites', values);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="1, 2, 3 or slug1, slug2"
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleCheckDuplicate}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Check for Duplicates
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create File'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Content</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('raw')}
                  className={`px-4 py-2 rounded-lg ${
                    mode === 'raw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Raw Markdown
                </button>
                <button
                  onClick={() => setMode('wysiwyg')}
                  className={`px-4 py-2 rounded-lg ${
                    mode === 'wysiwyg'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {mode === 'raw' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[600px] px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="Enter Markdown content here..."
              />
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 h-[600px] overflow-auto">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap">{content}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


