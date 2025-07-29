import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VersionManager } from '../version-manager';

describe('VersionManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock IndexedDB
    const mockIDBRequest = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    const mockIDB = {
      open: vi.fn(() => mockIDBRequest),
    };

    Object.defineProperty(window, 'indexedDB', {
      value: mockIDB,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    VersionManager.clearVersionData();
  });

  describe('getCurrentVersion', () => {
    it('should return default version when none stored', () => {
      const version = VersionManager.getCurrentVersion();

      expect(version.version).toBe('1.0.0');
      expect(version.features).toContain('基础GTD功能');
      expect(version.features).toContain('PWA支持');
      expect(version.features).toContain('离线模式');
      expect(version.critical).toBe(false);
    });

    it('should return stored version when available', () => {
      const testVersion = {
        version: '1.2.3',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['新功能1', '新功能2'],
        critical: true,
      };

      VersionManager.setCurrentVersion(testVersion);
      const retrievedVersion = VersionManager.getCurrentVersion();

      expect(retrievedVersion).toEqual(testVersion);
    });

    it('should handle corrupted stored version data', () => {
      localStorage.setItem('gtd-app-version', 'invalid-json');

      const version = VersionManager.getCurrentVersion();
      expect(version.version).toBe('1.0.0');
    });
  });

  describe('setCurrentVersion', () => {
    it('should store version in localStorage', () => {
      const testVersion = {
        version: '2.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['重大更新'],
        critical: false,
      };

      VersionManager.setCurrentVersion(testVersion);

      const stored = localStorage.getItem('gtd-app-version');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(testVersion);
    });

    it('should add version to update history', () => {
      const testVersion = {
        version: '1.1.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['功能改进'],
        critical: false,
      };

      VersionManager.setCurrentVersion(testVersion);

      const history = VersionManager.getUpdateHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(testVersion);
    });
  });

  describe('checkForUpdates', () => {
    it('should return null when no update available', async () => {
      // Mock Math.random to return value > 0.2 (no update)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const updateInfo = await VersionManager.checkForUpdates();
      expect(updateInfo).toBeNull();
    });

    it('should return update info when update available', async () => {
      // Mock Math.random to return value < 0.2 (update available)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const updateInfo = await VersionManager.checkForUpdates();

      expect(updateInfo).toBeTruthy();
      expect(updateInfo!.currentVersion).toBe('1.0.0');
      expect(updateInfo!.availableVersion).toBe('1.0.1');
      expect(updateInfo!.releaseNotes).toBeInstanceOf(Array);
      expect(updateInfo!.releaseNotes.length).toBeGreaterThan(0);
      expect(typeof updateInfo!.critical).toBe('boolean');
    });

    it('should handle errors gracefully', async () => {
      // Mock setTimeout to throw error
      vi.spyOn(global, 'setTimeout').mockImplementation(() => {
        throw new Error('Network error');
      });

      const updateInfo = await VersionManager.checkForUpdates();
      expect(updateInfo).toBeNull();
    });
  });

  describe('prepareForUpdate', () => {
    it('should create rollback data', async () => {
      const testVersion = {
        version: '1.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['基础功能'],
        critical: false,
      };

      VersionManager.setCurrentVersion(testVersion);

      // Mock IndexedDB to resolve quickly
      const mockDB = {
        objectStoreNames: [],
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: [],
            })),
          })),
        })),
      };

      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      window.indexedDB.open = vi.fn(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            (mockRequest.onsuccess as any)({ target: { result: mockDB } });
          }
        }, 10);
        return mockRequest as any;
      });

      await VersionManager.prepareForUpdate();

      const rollbackData = localStorage.getItem('gtd-rollback-data');
      expect(rollbackData).toBeTruthy();

      const parsed = JSON.parse(rollbackData!);
      expect(parsed.version).toEqual(testVersion);
      expect(parsed.timestamp).toBeTypeOf('number');
    }, 10000);
  });

  describe('completeUpdate', () => {
    it('should set new version and schedule rollback data cleanup', async () => {
      const newVersion = {
        version: '1.1.0',
        buildTime: '2024-01-02T00:00:00.000Z',
        features: ['新功能'],
        critical: false,
      };

      await VersionManager.completeUpdate(newVersion);

      const currentVersion = VersionManager.getCurrentVersion();
      expect(currentVersion).toEqual(newVersion);
    });
  });

  describe('rollback', () => {
    it('should return false when no rollback data available', async () => {
      const success = await VersionManager.rollback();
      expect(success).toBe(false);
    });

    it('should rollback to previous version when data available', async () => {
      const originalVersion = {
        version: '1.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['原始功能'],
        critical: false,
      };

      const newVersion = {
        version: '1.1.0',
        buildTime: '2024-01-02T00:00:00.000Z',
        features: ['新功能'],
        critical: false,
      };

      // Mock IndexedDB for prepare and rollback
      const mockDB = {
        objectStoreNames: [],
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: [],
            })),
          })),
        })),
      };

      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      window.indexedDB.open = vi.fn(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            (mockRequest.onsuccess as any)({ target: { result: mockDB } });
          }
        }, 10);
        return mockRequest as any;
      });

      // Set original version and prepare for update
      VersionManager.setCurrentVersion(originalVersion);
      await VersionManager.prepareForUpdate();

      // Update to new version
      VersionManager.setCurrentVersion(newVersion);

      // Rollback
      const success = await VersionManager.rollback();

      expect(success).toBe(true);
      const currentVersion = VersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe(originalVersion.version);
    }, 10000);

    it('should handle rollback errors gracefully', async () => {
      // Create invalid rollback data
      localStorage.setItem('gtd-rollback-data', 'invalid-json');

      const success = await VersionManager.rollback();
      expect(success).toBe(false);
    });
  });

  describe('getUpdateHistory', () => {
    it('should return empty array when no history', () => {
      const history = VersionManager.getUpdateHistory();
      expect(history).toEqual([]);
    });

    it('should return stored history', () => {
      const versions = [
        {
          version: '1.0.0',
          buildTime: '2024-01-01T00:00:00.000Z',
          features: ['初始版本'],
          critical: false,
        },
        {
          version: '1.1.0',
          buildTime: '2024-01-02T00:00:00.000Z',
          features: ['功能更新'],
          critical: false,
        },
      ];

      versions.forEach((version) => VersionManager.setCurrentVersion(version));

      const history = VersionManager.getUpdateHistory();
      expect(history).toHaveLength(2);
      expect(history).toEqual(versions);
    });

    it('should limit history to 10 versions', () => {
      // Add 15 versions
      for (let i = 1; i <= 15; i++) {
        VersionManager.setCurrentVersion({
          version: `1.${i}.0`,
          buildTime: '2024-01-01T00:00:00.000Z',
          features: [`版本 ${i}`],
          critical: false,
        });
      }

      const history = VersionManager.getUpdateHistory();
      expect(history).toHaveLength(10);
      expect(history[0].version).toBe('1.6.0'); // Should start from version 6
      expect(history[9].version).toBe('1.15.0'); // Should end at version 15
    });
  });

  describe('isRollbackAvailable', () => {
    it('should return false when no rollback data', () => {
      expect(VersionManager.isRollbackAvailable()).toBe(false);
    });

    it('should return true when rollback data exists', async () => {
      // Mock IndexedDB
      const mockDB = {
        objectStoreNames: [],
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: [],
            })),
          })),
        })),
      };

      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      window.indexedDB.open = vi.fn(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            (mockRequest.onsuccess as any)({ target: { result: mockDB } });
          }
        }, 10);
        return mockRequest as any;
      });

      VersionManager.setCurrentVersion({
        version: '1.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['测试'],
        critical: false,
      });

      await VersionManager.prepareForUpdate();

      expect(VersionManager.isRollbackAvailable()).toBe(true);
    }, 10000);
  });

  describe('getRollbackInfo', () => {
    it('should return null when no rollback data', () => {
      expect(VersionManager.getRollbackInfo()).toBeNull();
    });

    it('should return rollback info when data exists', async () => {
      // Mock IndexedDB
      const mockDB = {
        objectStoreNames: [],
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: [],
            })),
          })),
        })),
      };

      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      window.indexedDB.open = vi.fn(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            (mockRequest.onsuccess as any)({ target: { result: mockDB } });
          }
        }, 10);
        return mockRequest as any;
      });

      const version = {
        version: '1.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['测试'],
        critical: false,
      };

      VersionManager.setCurrentVersion(version);
      await VersionManager.prepareForUpdate();

      const rollbackInfo = VersionManager.getRollbackInfo();

      expect(rollbackInfo).toBeTruthy();
      expect(rollbackInfo!.version).toBe('1.0.0');
      expect(typeof rollbackInfo!.timestamp).toBe('number');
    }, 10000);
  });

  describe('clearVersionData', () => {
    it('should clear all version-related data', () => {
      // Set some data
      VersionManager.setCurrentVersion({
        version: '1.0.0',
        buildTime: '2024-01-01T00:00:00.000Z',
        features: ['测试'],
        critical: false,
      });

      localStorage.setItem('gtd-rollback-data', 'test');

      // Clear data
      VersionManager.clearVersionData();

      // Verify data is cleared
      expect(localStorage.getItem('gtd-app-version')).toBeNull();
      expect(localStorage.getItem('gtd-update-history')).toBeNull();
      expect(localStorage.getItem('gtd-rollback-data')).toBeNull();
    });
  });
});
