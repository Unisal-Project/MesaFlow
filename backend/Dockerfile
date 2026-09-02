FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# O client usa um diretório customizado (src/generated/prisma) e precisa
# existir antes de o TypeScript/tsx carregar a aplicação.
RUN npm run prisma:generate

EXPOSE 3333

CMD ["npm", "run", "dev"]
