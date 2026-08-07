import { fastify } from "fastify";
import { swaggerPlugin } from "./plugins/swagger";
import { authPlugin } from "./plugins/auth";
import { corsPlugin } from "./plugins/cors";


const app = fastify();

//plugins
app.register(swaggerPlugin);
app.register(authPlugin);
app.register(corsPlugin);

//routers
app.register(async (instance) => {

//coloca sua rota aqui

}, { prefix: "/api/v1" });

export const startServer = async () => {
  try {
    app.listen({ port: 3333, host: "0.0.0.0" });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();
