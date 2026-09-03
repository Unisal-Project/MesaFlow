import "@fastify/jwt"

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number
      email: string
      role: "ADMIN" | "EMPLOYEE"
    }

    user: {
      id: number
      email: string
      role: "ADMIN" | "EMPLOYEE"
    }
  }
}
