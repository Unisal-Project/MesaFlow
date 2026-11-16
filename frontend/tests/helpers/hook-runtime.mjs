// Controlled renders for testing hook workflows without a DOM or extra dependencies.
let slots, cursor;
export function createHookRunner(hook) {
  const state = [];
  return () => {
    slots = state;
    cursor = 0;
    return hook();
  };
}
export function useState(initial) {
  const index = cursor++;
  const state = slots;
  if (!(index in state))
    state[index] = typeof initial === "function" ? initial() : initial;
  return [
    state[index],
    (value) => {
      state[index] = typeof value === "function" ? value(state[index]) : value;
    },
  ];
}
export function useRef(value) {
  return useState(() => ({ current: value }))[0];
}
export const useCallback = (callback) => callback;
export const useMemo = (callback) => callback();
export const useEffect = () => {};
