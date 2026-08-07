FROM node:22-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante do código
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
