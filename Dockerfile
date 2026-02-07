FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configuration files
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy all knowledge base content directories
COPY --from=builder /app/android ./android
COPY --from=builder /app/aosp ./aosp
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/devops ./devops
COPY --from=builder /app/golang ./golang
COPY --from=builder /app/kotlin ./kotlin
COPY --from=builder /app/computer_science ./computer_science
COPY --from=builder /app/projects ./projects

# Copy scripts for indexing
COPY --from=builder /app/scripts ./scripts

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
