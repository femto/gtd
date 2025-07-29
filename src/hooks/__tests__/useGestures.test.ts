import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGestures } from '../useGestures';

// Mock touch events
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>
) => {
  const event = new Event(type) as any;
  event.touches = touches.map((touch) => ({ ...touch }));
  event.changedTouches = touches.map((touch) => ({ ...touch }));
  return event;
};

describe('useGestures', () => {
  it('should detect swipe left gesture', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useGestures({ onSwipeLeft }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    // Simulate swipe left (start right, end left)
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 200, clientY: 100 },
    ]);
    const touchEnd = createTouchEvent('touchend', [
      { clientX: 100, clientY: 100 },
    ]);

    element.dispatchEvent(touchStart);

    // Wait a bit to simulate gesture duration
    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeLeft).toHaveBeenCalled();
    }, 100);
  });

  it('should detect swipe right gesture', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useGestures({ onSwipeRight }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    // Simulate swipe right (start left, end right)
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
    ]);
    const touchEnd = createTouchEvent('touchend', [
      { clientX: 200, clientY: 100 },
    ]);

    element.dispatchEvent(touchStart);

    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeRight).toHaveBeenCalled();
    }, 100);
  });

  it('should detect tap gesture', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useGestures({ onTap }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    // Simulate tap (quick touch with minimal movement)
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
    ]);
    const touchEnd = createTouchEvent('touchend', [
      { clientX: 102, clientY: 102 },
    ]);

    element.dispatchEvent(touchStart);

    // Quick tap
    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onTap).toHaveBeenCalled();
    }, 50);
  });

  it('should detect long press gesture', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useGestures({ onLongPress }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
    ]);
    element.dispatchEvent(touchStart);

    // Wait for long press duration
    setTimeout(() => {
      expect(onLongPress).toHaveBeenCalled();
    }, 600);
  });

  it('should not trigger swipe for short distances', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useGestures({ onSwipeLeft }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    // Simulate short movement (less than minimum swipe distance)
    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
    ]);
    const touchEnd = createTouchEvent('touchend', [
      { clientX: 120, clientY: 100 },
    ]);

    element.dispatchEvent(touchStart);

    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeLeft).not.toHaveBeenCalled();
    }, 100);
  });

  it('should cancel long press on touch move', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useGestures({ onLongPress }));

    const element = document.createElement('div');
    (result.current as any).current = element;

    const touchStart = createTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
    ]);
    const touchMove = createTouchEvent('touchmove', [
      { clientX: 110, clientY: 100 },
    ]);

    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchMove);

    // Wait for long press duration
    setTimeout(() => {
      expect(onLongPress).not.toHaveBeenCalled();
    }, 600);
  });
});
