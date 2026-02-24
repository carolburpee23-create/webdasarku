# Dockerfile
FROM node:18-slim

# Install dependencies for Playwright and jor1k compilation
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libatspi2.0-0 \
    libxshmfence-dev \
    curl \
    clang \
    lld \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from the root and automation-system
COPY package*.json ./
COPY automation-system/package*.json ./automation-system/

# Install dependencies
RUN npm install
RUN cd automation-system && npm install --only=production

# Install Playwright browsers
RUN npx playwright install chromium

# Copy the rest of the source code
COPY . .

# Compile jor1k wasm if needed
RUN ./compile

# Create storage directories
RUN mkdir -p automation-system/storage/logs automation-system/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command
WORKDIR /app/automation-system
CMD ["npm", "start"]
