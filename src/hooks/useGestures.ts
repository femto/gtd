import { useEffect, useRef, useState } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onLongPress?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useGestures = (handlers: GestureHandlers) => {
  const elementRef = useRef<HTMLElement>(null);
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [initialDistance, setInitialDistance] = useState<number | null>(null);

  const minSwipeDistance = 50;
  const longPressDelay = 500;

  const getTouchPoint = (touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
  });

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const touchPoint = getTouchPoint(touch);
    setTouchStart(touchPoint);

    // Handle pinch gesture
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
    }

    // Start long press timer
    if (handlers.onLongPress) {
      const timer = setTimeout(() => {
        handlers.onLongPress!();
      }, longPressDelay);
      setLongPressTimer(timer);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Clear long press timer on move
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && initialDistance && handlers.onPinch) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistance;
      handlers.onPinch(scale);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const touchPoint = getTouchPoint(touch);

    const deltaX = touchPoint.x - touchStart.x;
    const deltaY = touchPoint.y - touchStart.y;
    const deltaTime = touchPoint.timestamp - touchStart.timestamp;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Check for tap (short duration, minimal movement)
    if (deltaTime < 200 && absX < 10 && absY < 10 && handlers.onTap) {
      handlers.onTap();
      return;
    }

    // Check for swipe gestures
    if (absX > minSwipeDistance || absY > minSwipeDistance) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }

    // Reset pinch state
    setInitialDistance(null);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, longPressTimer, initialDistance, handlers]);

  return elementRef;
};
