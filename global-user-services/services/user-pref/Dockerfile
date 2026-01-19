# Use an official Node.js image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR dist

# Copy package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Copy the .env file into the container
#COPY .env .env

# Build TypeScript code
RUN npm run build

# Set environment variable
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 4002
#test
# Start the application
CMD ["node", "dist/src/index.js"]
