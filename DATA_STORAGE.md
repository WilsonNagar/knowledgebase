# Data Storage Configuration

## Current Data Location

When you run `docker-compose up`, PostgreSQL data is stored on your host machine at the location specified by the `POSTGRES_DATA_PATH` environment variable.

### Default Location
- **Default path**: `./data/postgres` (relative to your project root)
- **Full path example**: `/Users/wilsonnagar/CursorProjects/knowledgebase/data/postgres`

### Previous Setup (Named Volume)
If you were using the previous setup with a Docker named volume, the data was stored in Docker's managed volume location:
- **macOS (Docker Desktop)**: `~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/knowledgestack_postgres_data/`
- **Linux**: `/var/lib/docker/volumes/knowledgestack_postgres_data/_data/`

## Configuring Data Storage Location

### Option 1: Using .env file (Recommended)

Edit your `.env` file and set `POSTGRES_DATA_PATH`:

```bash
# Store in project directory (default)
POSTGRES_DATA_PATH=./data/postgres

# Store in absolute path
POSTGRES_DATA_PATH=/Users/wilsonnagar/data/knowledgebase/postgres

# Store in home directory
POSTGRES_DATA_PATH=~/data/knowledgebase/postgres
```

### Option 2: Environment Variable

You can also set it when running docker-compose:

```bash
POSTGRES_DATA_PATH=/custom/path docker-compose up -d
```

## Migrating Existing Data

If you have existing data in a Docker named volume and want to migrate to a custom path:

### Step 1: Stop the containers
```bash
docker-compose down
```

### Step 2: Export data from the old volume
```bash
# Find the volume name
docker volume ls | grep postgres

# Create a temporary container to export data
docker run --rm -v knowledgestack_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

### Step 3: Update .env file
Set `POSTGRES_DATA_PATH` to your desired location in `.env`

### Step 4: Create the directory and restore
```bash
# Create the directory
mkdir -p ./data/postgres

# Restore data
docker run --rm -v $(pwd)/data/postgres:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

### Step 5: Start containers
```bash
docker-compose up -d
```

### Step 6: Clean up old volume (optional)
```bash
docker volume rm knowledgestack_postgres_data
```

## Backup and Restore

### Backup
```bash
# Backup the PostgreSQL data directory
tar czf postgres_backup_$(date +%Y%m%d).tar.gz -C ./data/postgres .
```

### Restore
```bash
# Stop containers
docker-compose down

# Restore from backup
tar xzf postgres_backup_YYYYMMDD.tar.gz -C ./data/postgres

# Start containers
docker-compose up -d
```

## Important Notes

1. **Permissions**: Make sure the directory has proper permissions. PostgreSQL needs read/write access.
2. **Backup**: Always backup your data before making changes.
3. **Path Format**: 
   - Use absolute paths for clarity: `/Users/username/data/postgres`
   - Relative paths work but are relative to where you run `docker-compose`
4. **Data Persistence**: The data persists on your host machine, so you can:
   - Backup easily by copying the directory
   - Move it to another machine
   - Version control (not recommended for production data)

## Checking Current Data Location

To see where your data is currently stored:

```bash
# Check docker-compose config
docker-compose config | grep -A 2 volumes

# Or check the actual mount point
docker inspect knowledgebase-postgres | grep -A 10 Mounts
```

