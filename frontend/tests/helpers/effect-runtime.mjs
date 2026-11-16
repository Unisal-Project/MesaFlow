// Igual ao hook-runtime, mas executa os efeitos na hora (para ver gravações).
export * from "./hook-runtime.mjs";
export const useEffect = (effect) => {
  effect();
};
