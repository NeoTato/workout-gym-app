import { useEffect, useRef, type ComponentRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

export function useExerciseScroll() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const pending = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  function requestScroll(id: string) {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    pending.current = id;
  }
  function onExerciseLayout(id: string, event: LayoutChangeEvent) {
    if (pending.current !== id) return;
    const y = Math.max(0, event.nativeEvent.layout.y - 8);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    // Wait for the expanded card and scroll content to finish their layout pass.
    frame.current = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
      pending.current = null; frame.current = null;
    });
  }
  return { scrollRef, requestScroll, onExerciseLayout };
}
