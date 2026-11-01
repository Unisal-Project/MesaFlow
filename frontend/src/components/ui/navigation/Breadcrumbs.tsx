import { Fragment } from "react";
type BreadcrumbItem = { label: string; href?: string };
type BreadcrumbsProps = { items: BreadcrumbItem[] };
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <Fragment key={item.label}>{index > 0 && <span>/</span>}{item.href ? <a href={item.href}>{item.label}</a> : <strong aria-current="page">{item.label}</strong>}</Fragment>)}</nav>;
}
