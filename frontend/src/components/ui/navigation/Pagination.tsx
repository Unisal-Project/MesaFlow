import { ChevronLeft, ChevronRight } from "lucide-react";
import { classNames } from "@/utils/classNames";
import { pageItems } from "@/utils/pagination";

type PaginationProps = { page: number; totalPages: number; onChange: (page: number) => void };

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Paginação">
      <button type="button" className="pagination-arrow" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden="true" />
      </button>
      {pageItems(page, totalPages).map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="pagination-gap" aria-hidden="true">…</span>
        ) : (
          <button key={item} type="button" className={classNames(item === page && "active")} aria-current={item === page ? "page" : undefined} onClick={() => onChange(item)}>
            {item}
          </button>
        ),
      )}
      <button type="button" className="pagination-arrow" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
