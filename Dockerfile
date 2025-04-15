
# Base image 
FROM node:20-alpine as build

# Set working directory
WORKDIR /app

# Install required tools for browserslist update
RUN apk add --no-cache curl

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies - with cache mounted to speed up future builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production=false

# Update browserslist database explicitly
RUN npx update-browserslist-db@latest --force

# Copy only necessary files for the build
COPY tsconfig*.json ./
COPY index.html ./
COPY vite.config.ts ./
COPY public/ ./public/
COPY src/ ./src/
COPY nginx.conf ./

# Build the application in production mode
RUN npm run build

# Production stage with minimal image
FROM nginx:alpine as production

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

# Add cache and compression headers to nginx
RUN echo "gzip on;\ngzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;" > /etc/nginx/conf.d/gzip.conf

# Expose port
EXPOSE 80

# Health check to ensure nginx is running properly
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
