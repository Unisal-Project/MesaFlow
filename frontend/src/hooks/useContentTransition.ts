import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

// Transição local: mantém os filtros e a navegação fora da área animada.
export function useContentTransition(selector?: string) {
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => {
    requestId.current += 1;
    animationRef.current?.cancel();
  }, []);

  const transitionContent = (update: () => void) => {
    const id = ++requestId.current;
    animationRef.current?.cancel();
    animationRef.current = null;
    const getContent = () => selector
      ? contentRef.current?.querySelector<HTMLElement>(selector)
      : contentRef.current;
    const content = getContent();
    if (!content?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }

    const run = async () => {
      const exit = content.animate([{ opacity: 0, transform: "translateY(-3px)" }],
        { duration: 110, easing: "ease-in", fill: "forwards" });
      animationRef.current = exit;
      try {
        await exit.finished;
      } catch {
        return;
      }
      if (id !== requestId.current) return;
      flushSync(update);
      exit.cancel();
      const nextContent = getContent();
      animationRef.current = nextContent?.animate([
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 300, easing: "cubic-bezier(.22, .61, .36, 1)" }) ?? null;
    };
    void run();
  };

  return { contentRef, transitionContent };
}
