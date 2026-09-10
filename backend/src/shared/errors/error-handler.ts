import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-errors.js";

export function errorHandler( error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ message: error.message });
    }
    if (error instanceof ZodError) {
        return reply.status(400).send({ message: "Dados inválidos", issues: error.issues });
    }
    if (typeof error === "object" && error !== null && "statusCode" in error) {
        const clientError = error as { statusCode?: unknown; message?: unknown };
        if (
            typeof clientError.statusCode === "number" &&
            clientError.statusCode >= 400 &&
            clientError.statusCode < 500
        ) {
            return reply.status(clientError.statusCode).send({
                message: typeof clientError.message === "string"
                    ? clientError.message
                    : "Requisição inválida",
            });
        }
    }
    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
}
