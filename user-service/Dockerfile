FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production deps from the lockfile for reproducible, smaller images
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Drop privileges for runtime
USER node

EXPOSE 3001
CMD ["node", "index.js"]
