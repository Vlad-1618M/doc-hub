# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY ui/package.json ui/package-lock.json* ./
RUN npm ci

COPY ui/ .
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY build/nginx-ui.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
