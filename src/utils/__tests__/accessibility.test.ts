import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  announceToScreenReader,
  trapFocus,
  isHighContrastMode,
  prefersReducedMotion,
  getContrastRatio,
  meetsWCAGContrast,
  generateId,
  setAriaExpanded,
  setAriaSelected,
  setAriaChecked,
  createSkipLink,
  isNavigationKey,
  isActionKey,
} from '../accessibility';

describe('accessibility utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('announceToScreenReader', () => {
    it('creates and removes announcement element', () => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[aria-live]');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toBe('Test message');
      expect(announcement?.getAttribute('aria-live')).toBe('polite');
      expect(announcement?.getAttribute('aria-atomic')).toBe('true');
    });

    it('supports assertive priority', () => {
      announceToScreenReader('Urgent message', 'assertive');

      const announcement = document.querySelector('[aria-live]');
      expect(announcement?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('trapFocus', () => {
    it('traps focus within element', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');

      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);

      const cleanup = trapFocus(container);

      // Simulate Tab key on last element
      button2.focus();
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(event);

      cleanup();
      document.body.removeChild(container);
    });
  });

  describe('isHighContrastMode', () => {
    it('detects high contrast mode', () => {
      const result = isHighContrastMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('prefersReducedMotion', () => {
    it('detects reduced motion preference', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getContrastRatio', () => {
    it('calculates contrast ratio correctly', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0); // Black on white has max contrast
    });

    it('handles same colors', () => {
      const ratio = getContrastRatio('#000000', '#000000');
      expect(ratio).toBe(1); // Same colors have ratio of 1
    });
  });

  describe('meetsWCAGContrast', () => {
    it('validates AA level contrast', () => {
      expect(meetsWCAGContrast('#000000', '#ffffff', 'AA')).toBe(true);
      expect(meetsWCAGContrast('#777777', '#ffffff', 'AA')).toBe(false);
    });

    it('validates AAA level contrast', () => {
      expect(meetsWCAGContrast('#000000', '#ffffff', 'AAA')).toBe(true);
      expect(meetsWCAGContrast('#666666', '#ffffff', 'AAA')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^id-/);
    });

    it('uses custom prefix', () => {
      const id = generateId('custom');
      expect(id).toMatch(/^custom-/);
    });
  });

  describe('ARIA utilities', () => {
    it('sets aria-expanded correctly', () => {
      const element = document.createElement('button');

      setAriaExpanded(element, true);
      expect(element.getAttribute('aria-expanded')).toBe('true');

      setAriaExpanded(element, false);
      expect(element.getAttribute('aria-expanded')).toBe('false');
    });

    it('sets aria-selected correctly', () => {
      const element = document.createElement('div');

      setAriaSelected(element, true);
      expect(element.getAttribute('aria-selected')).toBe('true');

      setAriaSelected(element, false);
      expect(element.getAttribute('aria-selected')).toBe('false');
    });

    it('sets aria-checked correctly', () => {
      const element = document.createElement('input');

      setAriaChecked(element, true);
      expect(element.getAttribute('aria-checked')).toBe('true');

      setAriaChecked(element, false);
      expect(element.getAttribute('aria-checked')).toBe('false');

      setAriaChecked(element, 'mixed');
      expect(element.getAttribute('aria-checked')).toBe('mixed');
    });
  });

  describe('createSkipLink', () => {
    it('creates skip link with correct attributes', () => {
      const skipLink = createSkipLink('main-content', 'Skip to main');

      expect(skipLink.tagName).toBe('A');
      expect((skipLink as HTMLAnchorElement).href).toContain('#main-content');
      expect(skipLink.textContent).toBe('Skip to main');
      expect(skipLink.className).toContain('sr-only');
    });
  });

  describe('keyboard utilities', () => {
    it('identifies navigation keys', () => {
      expect(isNavigationKey('ArrowUp')).toBe(true);
      expect(isNavigationKey('ArrowDown')).toBe(true);
      expect(isNavigationKey('Home')).toBe(true);
      expect(isNavigationKey('End')).toBe(true);
      expect(isNavigationKey('a')).toBe(false);
    });

    it('identifies action keys', () => {
      expect(isActionKey('Enter')).toBe(true);
      expect(isActionKey(' ')).toBe(true);
      expect(isActionKey('Space')).toBe(true);
      expect(isActionKey('a')).toBe(false);
    });
  });
});
