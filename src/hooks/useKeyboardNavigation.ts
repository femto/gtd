import { useEffect, useRef, useState } from 'react';

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (event: KeyboardEvent) => void;
  onHome?: () => void;
  onEnd?: () => void;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions = {}
) => {
  const containerRef = useRef<HTMLElement>(null);
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);

  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  const updateFocusableElements = () => {
    if (!containerRef.current) return;

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    const visibleElements = elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('aria-hidden') &&
        el.offsetParent !== null
      );
    });

    setFocusableElements(visibleElements);
  };

  const focusElement = (index: number) => {
    if (index >= 0 && index < focusableElements.length) {
      focusableElements[index].focus();
      setCurrentFocusIndex(index);
    }
  };

  const focusFirst = () => {
    focusElement(0);
  };

  const focusLast = () => {
    focusElement(focusableElements.length - 1);
  };

  const focusNext = () => {
    const nextIndex = (currentFocusIndex + 1) % focusableElements.length;
    focusElement(nextIndex);
  };

  const focusPrevious = () => {
    const prevIndex =
      currentFocusIndex <= 0
        ? focusableElements.length - 1
        : currentFocusIndex - 1;
    focusElement(prevIndex);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const { key, shiftKey, ctrlKey, metaKey } = event;

    // Skip if modifier keys are pressed (except Shift for Tab)
    if ((ctrlKey || metaKey) && key !== 'Tab') return;

    switch (key) {
      case 'Escape':
        if (options.onEscape) {
          event.preventDefault();
          options.onEscape();
        }
        break;

      case 'Enter':
        if (options.onEnter) {
          event.preventDefault();
          options.onEnter();
        }
        break;

      case 'ArrowUp':
        if (options.onArrowUp) {
          event.preventDefault();
          options.onArrowUp();
        }
        break;

      case 'ArrowDown':
        if (options.onArrowDown) {
          event.preventDefault();
          options.onArrowDown();
        }
        break;

      case 'ArrowLeft':
        if (options.onArrowLeft) {
          event.preventDefault();
          options.onArrowLeft();
        }
        break;

      case 'ArrowRight':
        if (options.onArrowRight) {
          event.preventDefault();
          options.onArrowRight();
        }
        break;

      case 'Tab':
        if (options.trapFocus && focusableElements.length > 0) {
          event.preventDefault();
          if (shiftKey) {
            focusPrevious();
          } else {
            focusNext();
          }
        }
        if (options.onTab) {
          options.onTab(event);
        }
        break;

      case 'Home':
        if (options.onHome) {
          event.preventDefault();
          options.onHome();
        } else if (focusableElements.length > 0) {
          event.preventDefault();
          focusFirst();
        }
        break;

      case 'End':
        if (options.onEnd) {
          event.preventDefault();
          options.onEnd();
        } else if (focusableElements.length > 0) {
          event.preventDefault();
          focusLast();
        }
        break;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateFocusableElements();

    // Auto focus first element if requested
    if (options.autoFocus && focusableElements.length > 0) {
      setTimeout(() => focusFirst(), 0);
    }

    container.addEventListener('keydown', handleKeyDown);

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-hidden'],
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, [focusableElements, currentFocusIndex, options]);

  return {
    containerRef,
    focusableElements,
    currentFocusIndex,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
  };
};
