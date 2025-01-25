# Use official Node.js image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first (cache dependencies)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all application files into the container
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
