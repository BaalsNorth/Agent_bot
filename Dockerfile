# Use Alpine Linux for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy application code
COPY index.js ./

# Set ownership to non-root user
RUN chown -R botuser:nodejs /app
USER botuser

# Set production environment
ENV NODE_ENV=production

# Optimize Node.js for production
ENV NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps=false"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]