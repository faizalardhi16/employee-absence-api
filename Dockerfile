# ---- Stage 1: dependencies + build ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files dulu (biar cache layer image)
COPY package*.json ./
RUN npm ci --silent || npm install

# Copy source & build dengan SWC
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production runtime ----
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy package + install production dependencies only (lebih kecil)
COPY package*.json ./
RUN npm ci --omit=dev --silent || npm install --omit=dev

# Copy hasil build
COPY --from=build /app/dist ./dist

# Non-root user (best practice docker)
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3100

CMD ["node", "dist/main"]
