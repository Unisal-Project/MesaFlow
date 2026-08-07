import { fastifySwaggerUi } from "@fastify/swagger-ui";

export const swaggerPlugin = async (fastify: any) => {
  fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    swagger: {
      info: {
        title: "OrderFlow API",
        description: "API documentation for the OrderFlow API",
        version: "1.0.0",
      },
      host: "localhost:3000",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
};
