FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files if any, though our backend package is inside backend/
COPY package*.json ./

# Make sure backend folder exists
RUN mkdir -p backend

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm ci --only=production

# Copy source code
COPY backend ./backend/
COPY modules ./modules/
COPY assets ./assets/
COPY extension ./extension/
COPY fb-autoposter.html ./
COPY sw.js ./
# Also config if any exist at root, but our main config is inside backend

# Create data directory with appropriate permissions
RUN mkdir -p backend/data && \
    chmod -R 777 backend/data

# Run application as non-root user (node user is built-in alpine)
# Expose port
EXPOSE 3000

# Start server
CMD ["node", "backend/server.js"]
