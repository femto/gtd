/**
 * Service Worker utilities for PWA functionality
 * Handles offline caching, background sync, and update notifications
 */

import * as React from 'react';

export interface SyncData {
  type: 'inbox' | 'action' | 'project' | 'context';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  constructor() {
    this.init();
  }

  private async init() {
    if ('serviceWorker' in navigator) {
      try {
        // Wait for the page to load before registering SW
        if (document.readyState === 'loading') {
          await new Promise((resolve) => {
            document.addEventListener('DOMContentLoaded', resolve);
          });
        }

        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        this.setupUpdateListener();
        this.setupMessageListener();
        this.setupPeriodicSync();

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private setupUpdateListener() {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            this.updateAvailable = true;
            this.notifyUpdateAvailable();
          }
        });
      }
    });
  }

  private setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'SYNC_COMPLETE':
          this.handleSyncComplete(payload);
          break;
        case 'CACHE_UPDATED':
          this.handleCacheUpdate(payload);
          break;
        default:
          console.log('Unknown message from SW:', event.data);
      }
    });
  }

  private notifyUpdateAvailable() {
    // Dispatch custom event for update notification
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  private handleSyncComplete(payload: any) {
    console.log('Background sync completed:', payload);
    // Notify components about sync completion
    window.dispatchEvent(
      new CustomEvent('sw-sync-complete', { detail: payload })
    );
  }

  private handleCacheUpdate(payload: any) {
    console.log('Cache updated:', payload);
    // Notify components about cache updates
    window.dispatchEvent(
      new CustomEvent('sw-cache-updated', { detail: payload })
    );
  }

  /**
   * Queue data for background sync when offline
   */
  async queueForSync(data: SyncData): Promise<void> {
    if (
      !('serviceWorker' in navigator) ||
      !navigator.serviceWorker.controller
    ) {
      throw new Error('Service Worker not available');
    }

    // Store in IndexedDB for background sync
    const syncQueue = await this.getSyncQueue();
    syncQueue.push({
      ...data,
      id: `${data.type}-${data.operation}-${Date.now()}`,
      timestamp: Date.now(),
    });

    await this.saveSyncQueue(syncQueue);

    // Register background sync
    if ('sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        // @ts-ignore - Background sync is not in TypeScript definitions yet
        await this.registration?.sync?.register('gtd-background-sync');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  /**
   * Get pending sync queue from IndexedDB
   */
  private async getSyncQueue(): Promise<any[]> {
    return new Promise((resolve) => {
      const request = indexedDB.open('gtd-sync-queue', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['queue'], 'readonly');
        const store = transaction.objectStore('queue');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result || []);
        };

        getAllRequest.onerror = () => {
          resolve([]);
        };
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }

  /**
   * Save sync queue to IndexedDB
   */
  private async saveSyncQueue(queue: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('gtd-sync-queue', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');

        // Clear existing queue
        store.clear();

        // Add all items
        queue.forEach((item) => {
          store.add(item);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if the app is currently offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Force update the service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) return;

    const newWorker = this.registration.waiting;
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Get update availability status
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Setup periodic sync for background operations
   */
  private setupPeriodicSync() {
    // Check for pending sync items periodically when online
    setInterval(async () => {
      if (navigator.onLine && this.registration) {
        const syncQueue = await this.getSyncQueue();
        if (syncQueue.length > 0) {
          try {
            // Trigger background sync
            if ('sync' in window.ServiceWorkerRegistration.prototype) {
              // @ts-ignore
              await this.registration.sync?.register('gtd-background-sync');
            }
          } catch (error) {
            console.error('Failed to register periodic sync:', error);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clear all cached data (for testing or reset purposes)
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }
  }

  /**
   * Get cache usage information
   */
  async getCacheInfo(): Promise<{ size: number; entries: number }> {
    if (!('caches' in window)) {
      return { size: 0, entries: 0 };
    }

    let totalSize = 0;
    let totalEntries = 0;

    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      totalEntries += keys.length;

      // Estimate size (this is approximate)
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return { size: totalSize, entries: totalEntries };
  }
}

// Singleton instance
export const swManager = new ServiceWorkerManager();

/**
 * Hook for React components to use service worker functionality
 */
export function useServiceWorker() {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [syncInProgress, setSyncInProgress] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    const handleSyncComplete = () => setSyncInProgress(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('sw-sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('sw-sync-complete', handleSyncComplete);
    };
  }, []);

  const queueForSync = async (data: SyncData) => {
    setSyncInProgress(true);
    try {
      await swManager.queueForSync(data);
    } catch (error) {
      console.error('Failed to queue for sync:', error);
      setSyncInProgress(false);
    }
  };

  const updateApp = async () => {
    await swManager.updateServiceWorker();
    setUpdateAvailable(false);
  };

  return {
    isOffline,
    updateAvailable,
    syncInProgress,
    queueForSync,
    updateApp,
  };
}
