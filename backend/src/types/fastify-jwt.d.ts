import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: "ADMIN" | "EMPLOYEE";
      /** users.token_version na emissão; ausente em tokens antigos (= 0). */
      tv?: number;
    };

    user: {
      id: string;
      email: string;
      role: "ADMIN" | "EMPLOYEE";
      /** users.token_version na emissão; ausente em tokens antigos (= 0). */
      tv?: number;
    };
  }
}
