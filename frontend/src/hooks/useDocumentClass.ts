import { useEffect } from "react";

/** Aplica o contexto de estilos enquanto a tela está montada. */
export function useDocumentClass(className: string) {
  useEffect(() => {
    document.documentElement.classList.add(className);
    return () => document.documentElement.classList.remove(className);
  }, [className]);
}
