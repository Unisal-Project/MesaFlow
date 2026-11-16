import type { FastifyReply, FastifyRequest } from "fastify";

export type SessionUser = {
  active: boolean;
  role: "ADMIN" | "EMPLOYEE";
  tokenVersion: number;
};
type SessionUserLoader = (id: bigint) => Promise<SessionUser | null>;

let loadSessionUser: SessionUserLoader = async (id) => {
  const { PrismaConnector } = await import("../database/prisma.js");
  return PrismaConnector.user.findUnique({
    where: { id },
    select: { active: true, role: true, tokenVersion: true },
  });
};

/** Troca a origem do usuário da sessão (testes com repositório em memória). */
export function setSessionUserLoader(loader: SessionUserLoader) {
  loadSessionUser = loader;
}

/**
 * JWT válido não basta: o usuário precisa existir, estar ativo e o "tv" do
 * token ser a token_version atual (logout, troca de senha, desativação e
 * mudança de perfil a incrementam). Daqui em diante vale o role do BANCO.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      message: "Token inválido ou não informado",
    });
  }
  const { id, tv = 0 } = request.user;
  const user = /^\d+$/.test(id) ? await loadSessionUser(BigInt(id)) : null;
  if (!user?.active || user.tokenVersion !== tv) {
    return reply.status(401).send({
      message: "Sessão expirada. Entre novamente.",
    });
  }
  request.user.role = user.role;
}
