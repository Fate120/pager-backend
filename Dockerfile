FROM node:20-alpine

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Default port
ENV PORT=3100

EXPOSE 3100

CMD ["node", "server.mjs"]
