// Screen reader utilities
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusableElement = focusableElements[0] as HTMLElement;
  const lastFocusableElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

// High contrast detection
export const isHighContrastMode = (): boolean => {
  // Create a test element to detect high contrast mode
  const testElement = document.createElement('div');
  testElement.style.border = '1px solid';
  testElement.style.borderColor = 'red green';
  testElement.style.position = 'absolute';
  testElement.style.height = '5px';
  testElement.style.top = '-999px';
  testElement.style.backgroundColor = 'red';

  document.body.appendChild(testElement);

  const computedStyle = window.getComputedStyle(testElement);
  const isHighContrast =
    computedStyle.borderTopColor === computedStyle.borderRightColor;

  document.body.removeChild(testElement);

  return isHighContrast;
};

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Color contrast utilities
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const sRGB = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

export const meetsWCAGContrast = (
  color1: string,
  color2: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  const ratio = getContrastRatio(color1, color2);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
};

// ARIA utilities
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const setAriaExpanded = (element: HTMLElement, expanded: boolean) => {
  element.setAttribute('aria-expanded', expanded.toString());
};

export const setAriaSelected = (element: HTMLElement, selected: boolean) => {
  element.setAttribute('aria-selected', selected.toString());
};

export const setAriaChecked = (
  element: HTMLElement,
  checked: boolean | 'mixed'
) => {
  element.setAttribute('aria-checked', checked.toString());
};

// Skip link utilities
export const createSkipLink = (targetId: string, text: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className =
    'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';

  return skipLink;
};

// Keyboard navigation helpers
export const isNavigationKey = (key: string): boolean => {
  return [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ].includes(key);
};

export const isActionKey = (key: string): boolean => {
  return ['Enter', ' ', 'Space'].includes(key);
};

// Focus visible utilities
export const addFocusVisiblePolyfill = () => {
  let hadKeyboardEvent = true;

  const focusTriggersKeyboardModality = (e: KeyboardEvent) => {
    if (
      [
        'Tab',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(e.key)
    ) {
      hadKeyboardEvent = true;
    }
  };

  const onPointerDown = () => {
    hadKeyboardEvent = false;
  };

  const onFocus = (e: FocusEvent) => {
    if (
      hadKeyboardEvent ||
      (e.target as HTMLElement).matches(':focus-visible')
    ) {
      (e.target as HTMLElement).classList.add('focus-visible');
    }
  };

  const onBlur = (e: FocusEvent) => {
    (e.target as HTMLElement).classList.remove('focus-visible');
  };

  document.addEventListener('keydown', focusTriggersKeyboardModality, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
};
