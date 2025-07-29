/**
 * Custom Service Worker for GTD Tool
 * Handles offline caching, background sync, and update notifications
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { BackgroundSync } = workbox.backgroundSync;
const { ExpirationPlugin } = workbox.expiration;

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up outdated caches
cleanupOutdatedCaches();

// Cache strategies for different types of resources
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Background sync for GTD data
const bgSync = new BackgroundSync('gtd-background-sync', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
});

// Handle background sync for GTD operations
registerRoute(
  ({ url }) => url.pathname.includes('/sync'),
  bgSync.replayPlugin(),
  'POST'
);

// Custom background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'gtd-background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    // Get pending sync items from IndexedDB
    const syncQueue = await getSyncQueue();
    
    for (const item of syncQueue) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        payload: { synced: syncQueue.length }
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getSyncQueue() {
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

async function removeSyncItem(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gtd-sync-queue', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function processSyncItem(item) {
  const { type, operation, data } = item;
  
  // Simulate API call - in real implementation, this would call actual API
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      operation,
      data,
      timestamp: item.timestamp,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notify clients when cache is updated
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Claim all clients
      await self.clients.claim();
      
      // Notify clients about cache update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          payload: { timestamp: Date.now() }
        });
      });
    })()
  );
});

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return cached offline page if available
        return caches.match('/offline.html') || caches.match('/');
      })
    );
  }
});