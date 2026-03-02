# Dockerfile for Cloud Desktop
FROM ubuntu:22.04

# Avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install LXDE, VNC, noVNC, and utilities
RUN apt-get update && apt-get install -y \
    lxde \
    xvfb \
    x11vnc \
    novnc \
    supervisor \
    curl \
    wget \
    python3 \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 3. Setup user and working directory
WORKDIR /app

# 4. Copy configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 5. Expose ports
# 6080 for noVNC
EXPOSE 6080
# 3000 for Automation API (if co-running)
EXPOSE 3000

# 6. Run supervisor
CMD ["/usr/bin/supervisord"]
