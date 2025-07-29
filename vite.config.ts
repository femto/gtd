/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5000000, // 5MB
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                plugins: [
                  {
                    cacheKeyWillBeUsed: async ({
                      request,
                    }: {
                      request: Request;
                    }) => {
                      return `${request.url}?${Date.now()}`;
                    },
                  },
                ],
              },
            },
          ],
        },
        manifest: {
          name: 'GTD工具',
          short_name: 'GTD',
          description: '基于Getting Things Done方法论的任务管理工具',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],

    // Build optimizations
    build: {
      target: 'es2020',
      minify: isProduction ? 'terser' : false,
      sourcemap: isProduction ? false : true,
      cssCodeSplit: true,

      // Terser options for better compression
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            mangle: {
              safari10: true,
            },
            format: {
              comments: false,
            },
          }
        : undefined,

      // Rollup options for code splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@headlessui/react', '@heroicons/react'],
            'db-vendor': ['dexie'],
            'utils-vendor': ['fuse.js', 'immer', 'zustand'],
            'workbox-vendor': [
              'workbox-background-sync',
              'workbox-expiration',
              'workbox-precaching',
              'workbox-routing',
              'workbox-strategies',
            ],
          },
          // Asset naming for better caching
          chunkFileNames: () => {
            return `assets/js/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || 'asset';
            const info = name.split('.');
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(name)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
    },

    // Development server configuration
    server: {
      port: 3000,
      host: true,
      headers: isProduction
        ? {}
        : {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
          },
    },

    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      headers: {
        // Security headers for preview
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@types': resolve(__dirname, 'src/types'),
        '@store': resolve(__dirname, 'src/store'),
        '@database': resolve(__dirname, 'src/database'),
        '@services': resolve(__dirname, 'src/services'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@contexts': resolve(__dirname, 'src/contexts'),
      },
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version || '1.0.0'
      ),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_PRODUCTION__: isProduction,
    },

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/__tests__/**',
        ],
      },
    },
  };
});
