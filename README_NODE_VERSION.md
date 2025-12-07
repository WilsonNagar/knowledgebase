# Node.js Version Setup

## ⚠️ Important: Use Node.js 20 LTS

This project requires **Node.js 20 LTS** (v20.x.x). The `better-sqlite3` module is compiled for Node 20 and will not work with Node 25.

## Quick Fix

### Option 1: Use Node 20 directly (Recommended)

```bash
# Set Node 20 in your PATH
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Verify version
node --version  # Should show v20.x.x

# Rebuild native modules
npm rebuild better-sqlite3

# Restart dev server
npm run dev
```

### Option 2: Use nvm (if installed)

```bash
# Install Node 20 if not already installed
nvm install 20

# Use Node 20
nvm use 20

# Verify
node --version  # Should show v20.x.x

# Rebuild native modules
npm rebuild better-sqlite3

# Restart dev server
npm run dev
```

### Option 3: Make it permanent (Add to shell config)

Add this to your `~/.zshrc` or `~/.bashrc`:

```bash
# Use Node 20 for knowledgebase project
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

Then restart your terminal or run:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Verify Setup

```bash
# Check Node version
node --version  # Should be v20.x.x

# Check if better-sqlite3 is compatible
node -e "require('better-sqlite3')"  # Should not error
```

## Troubleshooting

If you still get errors:

1. **Kill all Node processes**:
   ```bash
   pkill -f node
   ```

2. **Remove node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Rebuild native modules**:
   ```bash
   npm rebuild better-sqlite3
   ```

4. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Why Node 20?

- Node 25 requires C++20 compiler features
- `better-sqlite3` needs to be compiled for the specific Node version
- Node 20 LTS is stable and well-supported
- The project's `.nvmrc` file specifies Node 20

