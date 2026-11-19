import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { readPaymentConfirmation } from "./payment-confirmation.js";

const purpose = "customer-payment-confirmation";

export function issuePaymentSession(
  app: FastifyInstance,
  attendanceId: string,
) {
  return app.jwt.sign(
    { purpose, attendanceId, sessionId: randomUUID() },
    { expiresIn: "7d" },
  );
}

export function paymentConfirmationRoutes(
  app: FastifyInstance,
  {
    readConfirmation = readPaymentConfirmation,
  }: {
    readConfirmation?: typeof readPaymentConfirmation;
  } = {},
) {
  app.get("/client/payment-confirmation", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const token = /^Bearer (\S+)$/.exec(
      request.headers.authorization ?? "",
    )?.[1];
    try {
      const session =
        token &&
        app.jwt.verify<{
          purpose?: string;
          attendanceId?: string;
          sessionId?: string;
        }>(token);
      if (
        session &&
        session.purpose === purpose &&
        session.sessionId &&
        session.attendanceId &&
        /^\d+$/.test(session.attendanceId)
      ) {
        return readConfirmation(BigInt(session.attendanceId));
      }
    } catch {
      // Credenciais inválidas ou expiradas não autorizam a leitura da conta.
    }
    return reply.code(403).send({ message: "Sessão de atendimento inválida." });
  });
}
