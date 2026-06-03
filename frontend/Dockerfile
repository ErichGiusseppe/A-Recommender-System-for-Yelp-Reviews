# Stage 1 — build the Vite app
FROM node:20-slim AS builder

WORKDIR /app

# Accept the API URL at build time so it's baked into the JS bundle
ARG VITE_API_URL=https://lantern-api-585468318717.us-central1.run.app
ENV VITE_API_URL=$VITE_API_URL

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2 — serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: all unknown paths → index.html (React Router handles them)
RUN printf 'server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
