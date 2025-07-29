import { describe, it, expect, vi } from 'vitest';
import { ChunkedDataLoader } from '../lazy-loading';

describe('ChunkedDataLoader', () => {
  it('should load data in chunks', async () => {
    const mockLoadFn = vi
      .fn()
      .mockResolvedValueOnce(['item1', 'item2'])
      .mockResolvedValueOnce(['item3', 'item4'])
      .mockResolvedValueOnce(['item5']);

    const loader = new ChunkedDataLoader(mockLoadFn, 2);

    // Load first chunk
    const chunk1 = await loader.loadNextChunk();
    expect(chunk1).toEqual(['item1', 'item2']);
    expect(loader.getData()).toEqual(['item1', 'item2']);
    expect(loader.hasMore()).toBe(true);

    // Load second chunk
    const chunk2 = await loader.loadNextChunk();
    expect(chunk2).toEqual(['item3', 'item4']);
    expect(loader.getData()).toEqual(['item1', 'item2', 'item3', 'item4']);
    expect(loader.hasMore()).toBe(true);

    // Load final chunk (less than chunk size)
    const chunk3 = await loader.loadNextChunk();
    expect(chunk3).toEqual(['item5']);
    expect(loader.getData()).toEqual([
      'item1',
      'item2',
      'item3',
      'item4',
      'item5',
    ]);
    expect(loader.hasMore()).toBe(false);
  });

  it('should load specific chunks', async () => {
    const mockLoadFn = vi.fn().mockResolvedValue(['chunk-data']);

    const loader = new ChunkedDataLoader(mockLoadFn, 10);

    await loader.loadChunk(2);

    expect(mockLoadFn).toHaveBeenCalledWith(20, 10); // offset: 2 * 10, limit: 10
  });

  it('should reset correctly', async () => {
    const mockLoadFn = vi.fn().mockResolvedValue(['data']);
    const loader = new ChunkedDataLoader(mockLoadFn, 5);

    await loader.loadNextChunk();
    expect(loader.getData()).toEqual(['data']);

    loader.reset();
    expect(loader.getData()).toEqual([]);
    expect(loader.hasMore()).toBe(true);
  });
});

// Note: React hook tests are complex to mock properly in this environment
// Focus on testing the core ChunkedDataLoader class which provides the main functionality
