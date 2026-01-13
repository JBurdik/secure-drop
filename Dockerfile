# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code (including convex/_generated)
COPY . .

# Build args for Convex URLs (set at build time)
ARG VITE_CONVEX_URL
ARG VITE_CONVEX_SITE_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL

# Build the app
RUN bun run build

# Production stage - simple static server
FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "x", "serve", "-s", "dist", "-l", "3000"]
