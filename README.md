# Android Knowledge Base

A comprehensive, multi-user knowledge base system for advanced Android app developers. This project provides a structured learning path from beginner concepts to overachiever-level architecture patterns, with interactive features including diagrams, code examples, quizzes, and search.

## Features

- 📚 **Multi-level Learning Path**: Organized into 4 levels (Beginner → Intermediate → Advanced → Overachiever)
- 🔍 **Full-text Search**: Fast search across all content with filtering by level, tags, and knowledge base
- 📖 **Rich Content**: Markdown with Mermaid diagrams, syntax-highlighted code, and interactive quizzes
- 🎯 **Table of Contents**: Auto-generated TOC for easy navigation
- 👥 **Multi-user Support**: User accounts, bookmarks, progress tracking
- 🛠️ **Admin Interface**: Create and edit content with duplicate detection
- 🔄 **Auto-indexing**: Automatic reindexing when files are added or modified
- ✅ **Validation**: Frontmatter schema validation and uniqueness checks

## Project Structure

```
knowledgebase/
├── android/                    # Android knowledge base
│   ├── 01_beginners/          # Beginner level content
│   ├── 02_intermediate/       # Intermediate level content
│   ├── 03_advanced/           # Advanced level content
│   ├── 04_overachiever/       # Overachiever level content
│   ├── assets/                # Images and diagrams
│   └── examples/              # Code examples
├── app/                       # Next.js app directory
│   ├── api/                   # API routes
│   ├── browse/                # Browse page
│   ├── read/                  # Read page
│   └── admin/                 # Admin interface
├── components/                # React components
├── lib/                       # Utility libraries
├── scripts/                   # Utility scripts
└── types/                     # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) Docker and Docker Compose for containerized deployment

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd knowledgebase
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run setup-db
```

This will scan the `android/` directory and index all Markdown files into SQLite.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using Docker

1. Build and start containers:
```bash
docker-compose up -d
```

2. Access the application at [http://localhost:3000](http://localhost:3000)

## File Format

Each knowledge file is a Markdown file with YAML frontmatter:

```yaml
---
number: 1
title: "Introduction to Android Architecture"
slug: "introduction-to-android-architecture"
level: "beginner"
tags: ["architecture", "fundamentals"]
prerequisites: []
estimated_minutes: 45
contributors: []
diagrams: ["diagrams/01-architecture.svg"]
examples: ["examples/01-architecture/sample.kt"]
canonical_id: "android-01"
---

# Content starts here...
```

### Frontmatter Fields

- `number`: Integer ordering (must be unique)
- `title`: Canonical title
- `slug`: URL-safe identifier (must be unique per knowledgebase)
- `level`: One of `beginner`, `intermediate`, `advanced`, `overachiever`
- `tags`: Array of tags
- `prerequisites`: Array of file numbers or slugs
- `estimated_minutes`: Reading time estimate
- `contributors`: Array of contributor names
- `diagrams`: Optional array of diagram paths
- `examples`: Optional array of example code paths
- `canonical_id`: Globally unique identifier (format: `knowledgebase-NN`)

## Adding New Content

### Via Admin UI

1. Navigate to `/admin`
2. Fill in the frontmatter fields
3. Write your Markdown content
4. Click "Check for Duplicates" to verify uniqueness
5. Click "Create File" to save

### Via Git/File System

1. Create a new Markdown file in the appropriate level folder:
   - `android/01_beginners/` for beginner content
   - `android/02_intermediate/` for intermediate content
   - `android/03_advanced/` for advanced content
   - `android/04_overachiever/` for overachiever content

2. Follow the naming convention: `NN. Title.md` where NN is zero-padded (e.g., `01. Introduction.md`)

3. Include complete frontmatter (see File Format section)

4. Reindex the database:
```bash
npm run setup-db
```

Or trigger reindexing via API:
```bash
curl -X POST http://localhost:3000/api/index
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run setup-db` - Index all knowledge base files
- `npm run renumber` - Renumber files to maintain sequential order
- `npm run check-duplicates` - Check for duplicate content

### Renumbering Files

If you need to insert a file between existing numbers:

```bash
# Renumber all files starting from 1
npm run renumber

# Renumber starting from a specific number
node scripts/renumber.js ./android 10
```

### Checking for Duplicates

```bash
# Check with default threshold (0.6)
npm run check-duplicates

# Check with custom threshold
node scripts/check-duplicates.js ./android 0.7
```

## API Endpoints

### Files

- `GET /api/files` - List files (query params: `level`, `knowledgebase`, `tags`)
- `GET /api/files/[slug]` - Get file by slug
- `POST /api/files` - Reindex knowledge base (body: `{ action: 'reindex', knowledgebase: 'android' }`)

### Search

- `GET /api/search?q=query&level=beginner&knowledgebase=android` - Full-text search

### Index

- `GET /api/index` - List all knowledge bases
- `POST /api/index` - Index a knowledge base (body: `{ knowledgebase: 'android' }`)

### Admin

- `POST /api/admin/files` - Create new file
- `POST /api/admin/check-duplicate` - Check for duplicates

## Content Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [STYLE.md](./STYLE.md) for detailed guidelines on:
- Writing new entries
- Naming conventions
- Frontmatter usage
- Diagram conventions
- Code example standards

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Vercel/Netlify

1. Push to GitHub
2. Connect repository to Vercel/Netlify
3. Set environment variables if needed
4. Deploy

### Docker

```bash
docker-compose up -d
```

### Manual

```bash
npm run build
npm run serve
```

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with FTS5 for full-text search
- **Markdown**: remark, rehype, highlight.js
- **Diagrams**: Mermaid.js
- **Search**: SQLite FTS5, fuzzy matching with string-similarity

## Contributing

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Follow the style guide in [STYLE.md](./STYLE.md)
3. Create a branch for your changes
4. Add tests for new features
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions, please open an issue on GitHub.


