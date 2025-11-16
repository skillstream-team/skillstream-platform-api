# Use official Node.js LTS image
FROM node:20-alpine AS builder

# Set working directory inside container
WORKDIR /usr/src/app

# Install dependencies for TypeScript compilation
RUN apk add --no-cache bash git python3 make g++

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Copy Prisma schema (needed for postinstall script)
COPY prisma ./prisma

# Install dependencies (including dev dependencies for build)
RUN npm install

# Copy all source files
COPY . .

# Generate Prisma client (now that we have the schema)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage - smaller image
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma

# Install only production dependencies
RUN npm install --production && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose port (Render will set PORT env var, but EXPOSE needs a fixed number)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start the app
CMD ["node", "dist/server.js"]