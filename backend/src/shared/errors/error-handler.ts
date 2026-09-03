import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-errors.js";
import { request } from "node:http";

export function errorHandler( error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ message: error.message });
    }
    if (error instanceof ZodError) {
        return reply.status(400).send({ message: "Dados inválidos", issues: error.issues });
    }
    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
}  