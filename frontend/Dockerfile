# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install deps from lockfile for reproducibility
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Serve the application
RUN npm install -g serve
EXPOSE 3002

CMD ["serve", "-s", "build", "-l", "3002"]