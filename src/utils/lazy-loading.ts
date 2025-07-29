import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected, options]);

  return { targetRef, isIntersecting, hasIntersected };
};

/**
 * Lazy loading hook for data fetching
 */
export const useLazyData = <T>(fetchFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { targetRef, hasIntersected } = useIntersectionObserver();

  const loadData = useCallback(async () => {
    if (loading || data) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, loading, data]);

  useEffect(() => {
    if (hasIntersected) {
      loadData();
    }
  }, [hasIntersected, loadData]);

  return {
    targetRef,
    data,
    loading,
    error,
    reload: loadData,
  };
};

/**
 * Chunked data loading for large datasets
 */
export class ChunkedDataLoader<T> {
  private data: T[] = [];
  private chunkSize: number;
  private currentChunk: number = 0;
  private totalChunks: number = 0;
  private loadFn: (offset: number, limit: number) => Promise<T[]>;

  constructor(
    loadFn: (offset: number, limit: number) => Promise<T[]>,
    chunkSize: number = 50
  ) {
    this.loadFn = loadFn;
    this.chunkSize = chunkSize;
  }

  async loadNextChunk(): Promise<T[]> {
    const offset = this.currentChunk * this.chunkSize;
    const newChunk = await this.loadFn(offset, this.chunkSize);

    this.data.push(...newChunk);
    this.currentChunk++;

    // If we got less than chunkSize, we've reached the end
    if (newChunk.length < this.chunkSize) {
      this.totalChunks = this.currentChunk;
    }

    return newChunk;
  }

  async loadChunk(chunkIndex: number): Promise<T[]> {
    const offset = chunkIndex * this.chunkSize;
    return await this.loadFn(offset, this.chunkSize);
  }

  getData(): T[] {
    return this.data;
  }

  hasMore(): boolean {
    return this.totalChunks === 0 || this.currentChunk < this.totalChunks;
  }

  reset(): void {
    this.data = [];
    this.currentChunk = 0;
    this.totalChunks = 0;
  }
}

/**
 * Hook for infinite scrolling with chunked loading
 */
export const useInfiniteScroll = <T>(
  loadFn: (offset: number, limit: number) => Promise<T[]>,
  chunkSize: number = 50
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loaderRef = useRef<ChunkedDataLoader<T>>(
    new ChunkedDataLoader(loadFn, chunkSize)
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      await loaderRef.current.loadNextChunk();
      setData(loaderRef.current.getData());
      setHasMore(loaderRef.current.hasMore());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    loaderRef.current.reset();
    setData([]);
    setHasMore(true);
    setError(null);
  }, []);

  // Auto-load first chunk
  useEffect(() => {
    if (data.length === 0 && !loading) {
      loadMore();
    }
  }, [data.length, loading, loadMore]);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
  };
};

/**
 * Image lazy loading utility functions
 * Note: LazyImage component should be implemented in a .tsx file
 */

/**
 * Debounced search hook for performance
 */
export const useDebouncedSearch = <T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchFn(query);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay) as NodeJS.Timeout;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, searchFn, delay]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
};
