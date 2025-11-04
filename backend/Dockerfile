# Backend Dockerfile for Development
FROM node:24-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3001

# Development command (will be overridden by docker-compose)
CMD ["npm", "run", "dev"]