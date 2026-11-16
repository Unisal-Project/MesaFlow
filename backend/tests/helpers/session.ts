import { setSessionUserLoader } from "../../src/shared/authenticate.js";

/**
 * Sessões dos testes de rota: o hook de autenticação lê o usuário no banco;
 * aqui o "banco" diz que o id 1 é ADMIN e qualquer outro é EMPLOYEE, todos
 * ativos e com token_version 0 (tokens assinados sem "tv").
 */
setSessionUserLoader(async (id) => ({
  active: true,
  role: id === 1n ? "ADMIN" : "EMPLOYEE",
  tokenVersion: 0,
}));

export const idFor = (role: "ADMIN" | "EMPLOYEE") =>
  role === "ADMIN" ? "1" : "2";
