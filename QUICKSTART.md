# Quick Start Guide

This guide will help you get the Android Knowledge Base up and running quickly.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run setup-db
   ```
   
   This scans the `android/` directory and indexes all Markdown files.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## First Steps

### Browse Content

1. Click "Browse" in the navigation
2. Filter by level (Beginner, Intermediate, Advanced, Overachiever)
3. Click on any article to read it

### Search

1. Use the search bar on the Browse page
2. Search by title, content, or tags
3. Filter results by level

### Read an Article

1. Click on any article from the Browse page
2. Use the Table of Contents (right sidebar) to jump to sections
3. Take the quiz at the end to test your knowledge
4. Bookmark articles for later

### Add New Content (Admin)

1. Navigate to `/admin`
2. Fill in the frontmatter:
   - Choose knowledge base and level folder
   - Enter number, title, slug, canonical_id
   - Add tags and prerequisites
3. Write your Markdown content
4. Click "Check for Duplicates" to verify uniqueness
5. Click "Create File" to save

## Common Tasks

### Reindex After Adding Files

If you add files manually (via Git or file system):

```bash
# Option 1: Use the script
npm run setup-db

# Option 2: Use the API
curl -X POST http://localhost:3000/api/index
```

### Renumber Files

If you need to insert a file between existing numbers:

```bash
# Renumber all files starting from 1
npm run renumber

# Renumber starting from a specific number
node scripts/renumber.js ./android 10
```

### Check for Duplicates

Before submitting new content:

```bash
# Check with default threshold (0.6)
npm run check-duplicates

# Check with custom threshold
node scripts/check-duplicates.js ./android 0.7
```

## File Structure

```
android/
├── 01_beginners/          # Beginner level (3 files)
│   ├── 01. Introduction to Android Architecture.md
│   ├── 02. SOLID Principles.md
│   └── 03. Kotlin Coroutines Basics.md
├── 02_intermediate/        # Intermediate level (3 files)
│   ├── 10. Jetpack Compose State Management.md
│   ├── 11. Navigation & Deep Links.md
│   └── 12. Testing Compose UIs.md
├── 03_advanced/           # Advanced level (3 files)
│   ├── 20. Advanced Coroutines & Cancellation.md
│   ├── 21. Performance Profiling & Memory Leaks.md
│   └── 22. Building Offline-First Apps.md
└── 04_overachiever/        # Overachiever level (3 files)
    ├── 30. Designing Custom Renderers.md
    ├── 31. Build Systems & Advanced Gradle.md
    └── 32. Large Scale App Architecture Case Study.md
```

## Troubleshooting

### Database not found

If you see database errors:
```bash
npm run setup-db
```

### Files not appearing

1. Check file naming: `NN. Title.md` (with zero-padding)
2. Verify frontmatter is complete
3. Reindex: `npm run setup-db`

### Mermaid diagrams not rendering

1. Ensure Mermaid code blocks use ` ```mermaid ` syntax
2. Check browser console for errors
3. Refresh the page

### Search not working

1. Ensure database is indexed: `npm run setup-db`
2. Check that files have content
3. Try a different search query

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- Review [STYLE.md](./STYLE.md) for content style guide

## Getting Help

- Check existing issues on GitHub
- Review the documentation files
- Open a new issue for bugs or questions



