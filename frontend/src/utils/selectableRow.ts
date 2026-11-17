/** Cliques nestes elementos da linha fazem só a própria ação, sem marcar o item. */
const ROW_CONTROLS = "button, input, select, textarea, a, label, [role='switch'], dialog";

/** true quando o clique caiu numa área livre da linha (não num controle). */
export const isRowAreaClick = (event: { target: EventTarget }) =>
  !(event.target as HTMLElement).closest(ROW_CONTROLS);
