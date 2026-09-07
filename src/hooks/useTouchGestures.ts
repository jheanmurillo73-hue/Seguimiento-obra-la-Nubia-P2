import { useRef, useCallback, useEffect } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onLongPress?: () => void;
}

const SWIPE_THRESHOLD = 50; // pixels
const SWIPE_VELOCITY_THRESHOLD = 0.5; // pixels/ms
const LONG_PRESS_DURATION = 500; // ms

export const useTouchGestures = (
  ref: React.RefObject<HTMLElement>,
  handlers: GestureHandlers
) => {
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      // Iniciar timer para long press
      longPressTimerRef.current = setTimeout(() => {
        if (handlers.onLongPress) {
          handlers.onLongPress();
        }
      }, LONG_PRESS_DURATION);
    } else if (e.touches.length === 2 && handlers.onPinch) {
      // Detectar pinch (zoom)
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [handlers]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Cancelar long press al mover
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length === 2 && handlers.onPinch && initialDistanceRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const scale = currentDistance / initialDistanceRef.current;
      handlers.onPinch(scale);
    }
  }, [handlers]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Limpiar long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      if (touchStartRef.current && touchEndRef.current) {
        const deltaX = touchEndRef.current.x - touchStartRef.current.x;
        const deltaY = touchEndRef.current.y - touchStartRef.current.y;
        const deltaTime = touchEndRef.current.timestamp - touchStartRef.current.timestamp;
        const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;

        // Detectar swipe
        if (velocity > SWIPE_VELOCITY_THRESHOLD) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Swipe horizontal
            if (deltaX > SWIPE_THRESHOLD && handlers.onSwipeRight) {
              handlers.onSwipeRight();
            } else if (deltaX < -SWIPE_THRESHOLD && handlers.onSwipeLeft) {
              handlers.onSwipeLeft();
            }
          } else {
            // Swipe vertical
            if (deltaY > SWIPE_THRESHOLD && handlers.onSwipeDown) {
              handlers.onSwipeDown();
            } else if (deltaY < -SWIPE_THRESHOLD && handlers.onSwipeUp) {
              handlers.onSwipeUp();
            }
          }
        }
      }
    }

    initialDistanceRef.current = null;
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handlers]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart as EventListener);
    element.addEventListener('touchmove', handleTouchMove as EventListener);
    element.addEventListener('touchend', handleTouchEnd as EventListener);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchmove', handleTouchMove as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
};
