import { classNames } from "@/utils/classNames";
type Category = { id: string; label: string };
type CategoryTabsProps = { categories: Category[]; activeId: string; onChange: (id: string) => void };
export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  return <nav className="category-tabs" aria-label="Categorias">{categories.map((category) => <button key={category.id} type="button" aria-pressed={category.id === activeId} className={classNames(category.id === activeId && "active")} onClick={() => onChange(category.id)}>{category.label}</button>)}</nav>;
}
