import { fastifySwagger } from "@fastify/swagger";
import { fastifySwaggerUi } from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export const swaggerPlugin = async (fastify: FastifyInstance) => {
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "MesaFlow API",
        description: "Documentação da API do MesaFlow",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:3333" }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
};
