type LoadingCardProps = { label?: string };
export function LoadingCard({ label = "Carregando" }: LoadingCardProps) {
  return <div className="loader-card" role="status"><span className="spinner dark" aria-hidden="true" /><p>{label}</p></div>;
}
