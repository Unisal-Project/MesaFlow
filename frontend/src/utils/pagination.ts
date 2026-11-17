/** Até 7 páginas mostra todas; acima disso, janela compacta: 1 2 3 4 5 … 26 / 1 … 9 10 11 … 26 / 1 … 22 23 24 25 26. */
export function pageItems(page: number, totalPages: number): (number | "…")[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (totalPages <= 7) return range(1, totalPages);
  if (page <= 4) return [...range(1, 5), "…", totalPages];
  if (page >= totalPages - 3) return [1, "…", ...range(totalPages - 4, totalPages)];
  return [1, "…", page - 1, page, page + 1, "…", totalPages];
}
