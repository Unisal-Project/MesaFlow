import { fastifyJwt } from "@fastify/jwt";
import { FastifyInstance } from "fastify";
import "dotenv/config";

export async function authPlugin(fastify: FastifyInstance) {
  const jwt_secret = process.env.JWT_SECRET;

  if (!jwt_secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables.");
  }

  fastify.register(fastifyJwt, {
    secret: jwt_secret,
  });
}
