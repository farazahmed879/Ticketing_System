# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Accept build-time argument and pass it to Vite environment
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application (Vite reads VITE_API_URL during this step)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]