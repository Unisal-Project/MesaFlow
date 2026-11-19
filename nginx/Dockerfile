FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend/ ./frontend/
ARG VITE_API_URL=/api/v1
ARG VITE_PRINT_URL
ENV VITE_API_URL=$VITE_API_URL VITE_PRINT_URL=$VITE_PRINT_URL
RUN npm run build:frontend

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
