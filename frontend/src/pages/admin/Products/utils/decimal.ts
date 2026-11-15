/** Campo de dinheiro aceita "12,50" e "12.50"; a API recebe sempre com ponto. */
export const toDecimal = (value: string) => value.trim().replace(",", ".");

/** Valor monetário: inteiro ou com até 2 casas, vírgula ou ponto. */
export const MONEY_PATTERN = "\\d+([.,]\\d{1,2})?";
