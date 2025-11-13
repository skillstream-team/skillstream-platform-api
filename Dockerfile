# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Install dependencies for TypeScript compilation
RUN apk add --no-cache bash git python3 make g++

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port (Render will set PORT env var, but EXPOSE needs a fixed number)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start the app
CMD ["node", "dist/server.js"]