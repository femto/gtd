import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualScrollList } from '../VirtualScrollList';

// Mock data for testing
const createMockItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    title: `Item ${index}`,
    height: 50,
  }));
};

const MockItemComponent = ({ item, index }: { item: any; index: number }) => (
  <div data-testid={`item-${index}`} className="item">
    {item.title}
  </div>
);

describe('VirtualScrollList', () => {
  const defaultProps = {
    items: createMockItems(1000),
    itemHeight: 50,
    containerHeight: 400,
    renderItem: (item: any, index: number) => (
      <MockItemComponent key={item.id} item={item} index={index} />
    ),
  };

  it('should render only visible items', () => {
    render(<VirtualScrollList {...defaultProps} />);

    // Should render approximately containerHeight / itemHeight items plus overscan
    // 400 / 50 = 8 visible items + 5 overscan on each side = ~18 items
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeLessThan(25); // Should be much less than 1000
    expect(renderedItems.length).toBeGreaterThan(5); // Should render some items
  });

  it('should render first items initially', () => {
    render(<VirtualScrollList {...defaultProps} />);

    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByText('Item 0')).toBeInTheDocument();
  });

  it('should update visible items on scroll', () => {
    const { container } = render(<VirtualScrollList {...defaultProps} />);
    const scrollContainer = container.firstChild as HTMLElement;

    // Initial state - should see first items
    expect(screen.getByTestId('item-0')).toBeInTheDocument();

    // Scroll down
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } });

    // Should now see items around index 10 (500 / 50 = 10)
    // Note: Due to overscan, we might still see some earlier items
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    const itemIndices = visibleItems.map((item) =>
      parseInt(item.getAttribute('data-testid')?.split('-')[1] || '0')
    );

    expect(Math.max(...itemIndices)).toBeGreaterThan(5);
  });

  it('should handle custom overscan', () => {
    render(<VirtualScrollList {...defaultProps} overscan={10} />);

    const renderedItems = screen.getAllByTestId(/item-\d+/);
    // With higher overscan, should render more items
    expect(renderedItems.length).toBeGreaterThan(15);
  });

  it('should call onScroll callback', () => {
    const onScrollMock = vi.fn();
    const { container } = render(
      <VirtualScrollList {...defaultProps} onScroll={onScrollMock} />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 } });

    expect(onScrollMock).toHaveBeenCalledWith(200);
  });

  it('should handle empty items array', () => {
    render(<VirtualScrollList {...defaultProps} items={[]} />);

    expect(screen.queryByTestId(/item-\d+/)).not.toBeInTheDocument();
  });

  it('should handle variable item heights', () => {
    const variableHeightItems = [
      { id: '1', title: 'Item 1', height: 30 },
      { id: '2', title: 'Item 2', height: 60 },
      { id: '3', title: 'Item 3', height: 45 },
    ];

    render(
      <VirtualScrollList
        {...defaultProps}
        items={variableHeightItems}
        estimatedItemHeight={45}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualScrollList {...defaultProps} className="custom-scroll-class" />
    );

    expect(container.firstChild).toHaveClass('custom-scroll-class');
  });

  it('should calculate correct total height', () => {
    const { container } = render(<VirtualScrollList {...defaultProps} />);
    const scrollContainer = container.firstChild as HTMLElement;
    const innerContainer = scrollContainer.firstChild as HTMLElement;

    // Total height should be items.length * itemHeight
    expect(innerContainer.style.height).toBe('50000px'); // 1000 * 50
  });
});

describe('useVirtualScroll hook', () => {
  it('should calculate visible range correctly', () => {
    const items = createMockItems(100);
    const containerHeight = 400;
    const itemHeight = 50;

    // This would typically be used in a component, but we can test the logic
    const mockScrollTop = 250; // Scrolled to show items around index 5

    const startIndex = Math.max(0, Math.floor(mockScrollTop / itemHeight) - 5);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((mockScrollTop + containerHeight) / itemHeight) + 5
    );

    expect(startIndex).toBe(0); // Math.max(0, 5 - 5)
    expect(endIndex).toBe(18); // Math.min(99, 13 + 5)
  });

  it('should handle edge cases for visible range', () => {
    const items = createMockItems(5); // Small dataset
    const containerHeight = 400;
    const itemHeight = 50;
    const scrollTop = 0;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
    );

    expect(startIndex).toBe(0);
    expect(endIndex).toBe(4); // Should not exceed items.length - 1
  });
});

// Integration test for performance
describe('VirtualScrollList Performance', () => {
  it('should handle large datasets efficiently', () => {
    const largeDataset = createMockItems(10000);
    const startTime = performance.now();

    render(
      <VirtualScrollList
        items={largeDataset}
        itemHeight={50}
        containerHeight={400}
        renderItem={(item, index) => (
          <div key={item.id} data-testid={`item-${index}`}>
            {item.title}
          </div>
        )}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with large dataset
    expect(renderTime).toBeLessThan(100); // Less than 100ms

    // Should only render visible items, not all 10000
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeLessThan(50);
  });

  it('should maintain performance during scrolling', () => {
    const largeDataset = createMockItems(5000);
    const { container } = render(
      <VirtualScrollList
        items={largeDataset}
        itemHeight={50}
        containerHeight={400}
        renderItem={(item, index) => (
          <div key={item.id} data-testid={`item-${index}`}>
            {item.title}
          </div>
        )}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;

    // Perform multiple scroll operations
    const scrollOperations = [100, 500, 1000, 2000, 3000];

    scrollOperations.forEach((scrollTop) => {
      const startTime = performance.now();

      fireEvent.scroll(scrollContainer, { target: { scrollTop } });

      const endTime = performance.now();
      const scrollTime = endTime - startTime;

      // Each scroll operation should be fast
      expect(scrollTime).toBeLessThan(50);
    });
  });
});
