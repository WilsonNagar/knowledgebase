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

This will scan knowledge base directories and index all Markdown files into PostgreSQL.

**Note**: For local development without Docker, you'll need a PostgreSQL database running. For Docker deployment, the database is automatically set up.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using Docker

This project uses a multi-container Docker setup with clear separation between services:

- **PostgreSQL**: Database service (persists data, doesn't need rebuilding)
- **App**: Next.js application (frontend + backend API routes)
- **Nginx**: Reverse proxy for routing
- **Init**: One-time initialization service for indexing content

#### Quick Start

1. **Create environment file** (optional, uses defaults if not provided):
```bash
# Create .env file with your configuration
cat > .env << EOF
POSTGRES_USER=knowledgebase
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=knowledgebase
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATA_PATH=./data/postgres
APP_CONTAINER_NAME=knowledgebase-app
POSTGRES_CONTAINER_NAME=knowledgebase-postgres
NGINX_CONTAINER_NAME=knowledgebase-nginx
APP_PORT=3000
NGINX_PORT=80
NODE_ENV=production
AUTO_INDEX=true
EOF
```

2. **Build and start all containers**:
```bash
docker-compose up -d --build
```

3. **Check container status**:
```bash
docker-compose ps
```

4. **View logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

5. **Access the application**:
   - Via Nginx: [http://localhost](http://localhost) (port 80)
   - Direct app access: [http://localhost:3000](http://localhost:3000)
   - PostgreSQL: `localhost:5432`

#### Updating Code (Rebuilding Only App Container)

When you make code changes, you only need to rebuild the app container. The PostgreSQL container will remain untouched, preserving your data:

```bash
# Rebuild and restart only the app container
docker-compose up -d --build app

# Or rebuild without cache for a clean build
docker-compose build --no-cache app
docker-compose up -d app
```

#### Managing Services

```bash
# Stop all services
docker-compose down

# Stop services but keep volumes (preserves database)
docker-compose stop

# Remove everything including volumes (⚠️ deletes database)
docker-compose down -v

# Restart a specific service
docker-compose restart app

# View resource usage
docker-compose stats
```

#### Database Management

The PostgreSQL data is persisted in `./data/postgres` (or your configured `POSTGRES_DATA_PATH`). This means:
- Database survives container rebuilds
- You can backup by copying the `data/postgres` directory
- Database migrations only run when needed (schema auto-initializes)

**Backup database**:
```bash
# Using pg_dump
docker-compose exec postgres pg_dump -U knowledgebase knowledgebase > backup.sql

# Or backup the data directory
tar czf postgres_backup_$(date +%Y%m%d).tar.gz -C ./data/postgres .
```

**Restore database**:
```bash
# From SQL dump
docker-compose exec -T postgres psql -U knowledgebase knowledgebase < backup.sql

# Or restore data directory
tar xzf postgres_backup_YYYYMMDD.tar.gz -C ./data/postgres
```

#### Indexing Content

Content is automatically indexed on first startup. To manually reindex:

```bash
# Via API (after containers are running)
curl -X POST http://localhost/api/index -H "Content-Type: application/json" -d '{"knowledgebase": "android"}'

# Or run init container again
docker-compose run --rm init
```

#### Production Deployment

For production, consider:

1. **Remove volume mounts** from `docker-compose.yml` (lines 34-42) to use baked-in content
2. **Use strong passwords** in `.env` file
3. **Set up SSL/TLS** with Let's Encrypt (update nginx.conf)
4. **Configure backups** for PostgreSQL data
5. **Use Docker secrets** for sensitive data
6. **Set resource limits** in docker-compose.yml

See [DEPLOYMENT.md](./DEPLOYMENT.md) for CI/CD and automated deployment instructions.

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

### Docker (Recommended)

See the [Using Docker](#using-docker) section above for detailed instructions.

**Quick deployment**:
```bash
docker-compose up -d --build
```

### Manual (Local Development)

```bash
npm install
npm run build
npm run start
```

### Vercel/Netlify

For serverless deployment:
1. Push to GitHub
2. Connect repository to Vercel/Netlify
3. Set environment variables (database connection, etc.)
4. Deploy

**Note**: Serverless deployments require a separate PostgreSQL database (e.g., Supabase, Railway, or AWS RDS).

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16 with full-text search (GIN indexes)
- **Markdown**: remark, rehype, highlight.js
- **Diagrams**: Mermaid.js
- **Search**: PostgreSQL full-text search, fuzzy matching with string-similarity
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx

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



