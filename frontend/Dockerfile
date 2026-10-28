FROM node:22-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o restante do código
COPY . .

EXPOSE 5173

# O volume de node_modules persiste entre builds; sincroniza com o lockfile ao iniciar.
CMD ["sh", "-c", "npm ci && exec npm run dev"]
