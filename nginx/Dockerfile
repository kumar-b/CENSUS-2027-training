# Stage 1: Build the React client
FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# vite outDir is ../client_build relative to /app → /client_build
RUN npm run build

# Stage 2: Nginx serving the built assets
FROM nginx:alpine
COPY --from=builder /client_build /usr/share/nginx/html
EXPOSE 80
