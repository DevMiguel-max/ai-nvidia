"use client";
import { useEffect, useRef, useState } from "react";

/** Sticks to the bottom of the container as `dependency` changes, unless the
 *  user has scrolled up to read earlier messages — matches the behavior
 *  people expect from ChatGPT-style streaming. */
export function useAutoScroll<T>(dependency: T) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setStickToBottom(distanceFromBottom < 80);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stickToBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency, stickToBottom]);

  return containerRef;
}
