import { act, renderHook } from '@testing-library/react-native';
import type { ComponentRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { useExerciseScroll } from '../useExerciseScroll';

it('scrolls once to the newly added card after layout, without jumping on later edits', async () => {
  const frames: FrameRequestCallback[] = [];
  const frame = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
  const scrollTo = jest.fn();
  try {
    const { result } = await renderHook(useExerciseScroll);
    const scroll: Pick<ComponentRef<typeof ScrollView>, 'scrollTo'> = { scrollTo };
    result.current.scrollRef.current = scroll as ComponentRef<typeof ScrollView>;
    const layout = { nativeEvent: { layout: { y: 900, x: 0, width: 350, height: 320 } } } as LayoutChangeEvent;
    await act(async () => { result.current.requestScroll('new'); result.current.onExerciseLayout('old', layout); });
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { result.current.onExerciseLayout('new', layout); });
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { frames.shift()!(0); });
    expect(scrollTo).toHaveBeenCalledWith({ y: 892, animated: true });
    await act(async () => { result.current.onExerciseLayout('new', layout); });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  } finally { frame.mockRestore(); }
});
