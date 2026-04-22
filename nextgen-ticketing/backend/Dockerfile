# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema first for generation
COPY prisma ./prisma/

# Generate Prisma Client
ENV DATABASE_URL="mongodb+srv://farazahmedshaikh879_db_user:Bm1AheusjlqVufGz@cluster0.pxvrnbb.mongodb.net/TicketingSystem?retryWrites=true&w=majority"
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
