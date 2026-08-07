import { fastifyCors } from "@fastify/cors";
import { FastifyInstance } from "fastify";

export async function corsPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyCors, {
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
  });
}
