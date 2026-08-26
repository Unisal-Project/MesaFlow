import { classNames } from "../shared/classNames";
type PaginationProps = { page: number; totalPages: number; onChange: (page: number) => void };
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return <nav className="pagination" aria-label="Paginação"><button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button key={item} type="button" className={classNames(item === page && "active")} aria-current={item === page ? "page" : undefined} onClick={() => onChange(item)}>{item}</button>)}<button type="button" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button></nav>;
}
