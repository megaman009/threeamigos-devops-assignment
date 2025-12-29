# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Build-time configuration for Create React App (baked into the static bundle)
ARG REACT_APP_PRODUCT_API_URL
ARG REACT_APP_USER_API_URL
ARG REACT_APP_API_URL
ARG REACT_APP_DEMO_USER_ID

ENV REACT_APP_PRODUCT_API_URL=$REACT_APP_PRODUCT_API_URL
ENV REACT_APP_USER_API_URL=$REACT_APP_USER_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_DEMO_USER_ID=$REACT_APP_DEMO_USER_ID

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