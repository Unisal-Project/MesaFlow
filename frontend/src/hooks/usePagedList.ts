import { useState } from "react";

/** "Todos" mostra até 999 por página; acima disso pagina de 999 em 999. */
export const SHOW_ALL = 999;
export const PAGE_SIZES = [25, 50, 100, SHOW_ALL];

/**
 * Pagina uma lista no cliente; a página volta ao intervalo válido quando a lista encolhe.
 * `resetKey` identifica busca/filtros/ordem: quando muda, volta à página 1
 * (senão, de dentro da página 2, uma busca nova mostraria só os itens 26–30).
 */
export function usePagedList<T>(items: T[], resetKey = "") {
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [seenKey, setSeenKey] = useState(resetKey);
  const changed = seenKey !== resetKey;
  if (changed) {
    setSeenKey(resetKey);
    setPage(1);
  }
  const size = pageSize;
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(changed ? 1 : page, totalPages);
  return {
    pageItems: items.slice((current - 1) * size, current * size),
    pager: {
      total: items.length,
      page: current,
      pageSize,
      first: (current - 1) * size + 1,
      last: Math.min(current * size, items.length),
      totalPages,
      onPage: setPage,
      onPageSize: (size: number) => { setPageSize(size); setPage(1); },
    },
  };
}
