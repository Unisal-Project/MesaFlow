FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/app/package.json frontend/app/package-lock.json ./
RUN npm ci
COPY frontend/app/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
