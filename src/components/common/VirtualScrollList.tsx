import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

export interface VirtualScrollItem {
  id: string;
  height?: number;
}

export interface VirtualScrollListMethods {
  scrollToItem: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

interface VirtualScrollListProps<T extends VirtualScrollItem> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  estimatedItemHeight?: number;
}

/**
 * Virtual scrolling component for efficiently rendering large lists
 * Only renders visible items plus a small buffer (overscan)
 */
export const VirtualScrollList = forwardRef<
  VirtualScrollListMethods,
  VirtualScrollListProps<any>
>(function VirtualScrollList(
  {
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    className = '',
    onScroll,
    estimatedItemHeight,
  },
  ref
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate which items should be visible
  const visibleRange = useMemo(() => {
    const effectiveItemHeight = estimatedItemHeight || itemHeight;
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / effectiveItemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / effectiveItemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [
    scrollTop,
    containerHeight,
    itemHeight,
    estimatedItemHeight,
    overscan,
    items.length,
  ]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Calculate total height and offset
  const totalHeight = useMemo(() => {
    if (estimatedItemHeight) {
      // If using estimated heights, calculate based on actual item heights
      return items.reduce(
        (total, item) => total + (item.height || estimatedItemHeight),
        0
      );
    }
    return items.length * itemHeight;
  }, [items, itemHeight, estimatedItemHeight]);

  const offsetY = useMemo(() => {
    if (estimatedItemHeight) {
      // Calculate offset based on actual item heights
      let offset = 0;
      for (let i = 0; i < visibleRange.startIndex; i++) {
        offset += items[i]?.height || estimatedItemHeight;
      }
      return offset;
    }
    return visibleRange.startIndex * itemHeight;
  }, [visibleRange.startIndex, itemHeight, estimatedItemHeight, items]);

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Scroll to specific item
  const scrollToItem = useCallback(
    (index: number) => {
      if (!scrollElementRef.current) return;

      let targetScrollTop = 0;
      if (estimatedItemHeight) {
        for (let i = 0; i < index; i++) {
          targetScrollTop += items[i]?.height || estimatedItemHeight;
        }
      } else {
        targetScrollTop = index * itemHeight;
      }

      scrollElementRef.current.scrollTop = targetScrollTop;
    },
    [itemHeight, estimatedItemHeight, items]
  );

  // Expose scroll methods via ref
  const scrollMethods: VirtualScrollListMethods = {
    scrollToItem,
    scrollToTop: () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = 0;
      }
    },
    scrollToBottom: () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = totalHeight;
      }
    },
  };

  useImperativeHandle(ref, () => scrollMethods, [scrollMethods]);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                height: item.height || itemHeight,
                minHeight: item.height || itemHeight,
              }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Hook for managing virtual scroll state
export const useVirtualScroll = <T extends VirtualScrollItem>(
  items: T[],
  containerHeight: number,
  itemHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    scrollRef,
    visibleItems,
    totalHeight,
    offsetY,
    visibleRange,
    setScrollTop,
  };
};
