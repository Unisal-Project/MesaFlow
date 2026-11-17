import { Pagination } from "./Pagination";
import { PAGE_SIZES, SHOW_ALL, type usePagedList } from "@/hooks/usePagedList";

type ListPagerProps = ReturnType<typeof usePagedList>["pager"] & { label: string };

/** Só aparece quando a lista passa do menor tamanho de página. */
export function ListPager({ total, page, pageSize, first, last, totalPages, onPage, onPageSize, label }: ListPagerProps) {
  if (total <= PAGE_SIZES[0]) return null;
  return (
    <div className="list-pager">
      <label>
        Mostrar
        <select aria-label={`${label} por página`} value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
          {PAGE_SIZES.map((size) => <option key={size} value={size}>{size === SHOW_ALL ? "Todos" : size}</option>)}
        </select>
        por página
      </label>
      <span>{first}–{last} de {total}</span>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={onPage} />}
    </div>
  );
}
