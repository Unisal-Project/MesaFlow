type TableCardProps = { number: number; status: string; total: string; onClick?: () => void };
export function TableCard({ number, status, total, onClick }: TableCardProps) {
  return <article className="table-card" onClick={onClick}><span className="table-number">{number}</span><div><h3>Mesa {number}</h3><p>{status}</p></div><strong>{total}</strong></article>;
}
