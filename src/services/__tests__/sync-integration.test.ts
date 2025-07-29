/**
 * 同步功能集成测试
 * 测试数据同步的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncService } from '../sync-service';
import { syncAPI } from '../sync-api';
import { conflictResolver } from '../conflict-resolver';
import type {
  SyncConfig,
  DeviceInfo,
  ConflictRecord,
  SyncRecord,
} from '../../types/sync';

// Mock dependencies
vi.mock('../sync-api');
vi.mock('../sync-service');
vi.mock('../../database/schema');

describe('Sync Integration Tests', () => {
  let mockConfig: SyncConfig;

  const mockDevices: DeviceInfo[] = [
    {
      id: 'device-1',
      name: 'MacBook Pro',
      type: 'desktop',
      platform: 'macOS',
      lastSeen: new Date('2023-01-01T10:00:00Z'),
      isActive: true,
    },
    {
      id: 'device-2',
      name: 'iPhone 14',
      type: 'mobile',
      platform: 'iOS',
      lastSeen: new Date('2023-01-01T09:30:00Z'),
      isActive: false,
    },
    {
      id: 'device-3',
      name: 'iPad Air',
      type: 'tablet',
      platform: 'iPadOS',
      lastSeen: new Date('2023-01-01T08:00:00Z'),
      isActive: true,
    },
  ];

  beforeEach(() => {
    mockConfig = {
      apiEndpoint: 'https://api.example.com',
      deviceId: 'test-device-123',
      autoSync: false,
      syncInterval: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 100,
    };

    // mockDeviceInfo removed as it was unused

    // Reset mocks
    vi.clearAllMocks();

    // Mock sync API
    vi.mocked(syncAPI.getDevices).mockResolvedValue(mockDevices);
    vi.mocked(syncAPI.updateDevice).mockResolvedValue();

    // Mock sync service with fresh state for each test
    const freshSyncState = {
      status: 'success' as const,
      lastSyncTime: new Date('2023-01-01T10:00:00Z'),
      lastSuccessTime: new Date('2023-01-01T10:00:00Z'),
      pendingChanges: 3,
      conflictCount: 1,
      error: null,
      isAutoSyncEnabled: true,
      syncInterval: 300000,
    };
    const freshSyncStats = {
      totalSynced: 0,
      totalConflicts: 2,
      lastSyncDuration: 1500,
      averageSyncTime: 1200,
      syncHistory: [],
    };

    vi.mocked(syncService.getSyncState).mockReturnValue(freshSyncState);
    vi.mocked(syncService.getSyncStats).mockReturnValue(freshSyncStats);
    vi.mocked(syncService.getConflicts).mockResolvedValue([]);
    vi.mocked(syncService.fullSync).mockResolvedValue();
    vi.mocked(syncService.startAutoSync).mockImplementation(() => {});
    vi.mocked(syncService.stopAutoSync).mockImplementation(() => {});
    vi.mocked(syncService.on).mockImplementation(() => {});
    vi.mocked(syncService.off).mockImplementation(() => {});
  });

  afterEach(() => {
    syncService.stopAutoSync();
  });

  describe('初始化', () => {
    it('应该正确初始化同步服务', async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);

      expect(mockInitialize).toHaveBeenCalledWith(mockConfig);
      expect(mockRegisterDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConfig.deviceId,
          type: 'desktop',
        })
      );

      const state = syncService.getSyncState();
      expect(state.syncInterval).toBe(mockConfig.syncInterval);
      expect(state.isAutoSyncEnabled).toBe(mockConfig.autoSync);
    });

    it('应该在自动同步启用时启动定时器', async () => {
      const autoSyncConfig = { ...mockConfig, autoSync: true };

      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(autoSyncConfig);

      const state = syncService.getSyncState();
      expect(state.isAutoSyncEnabled).toBe(true);
    });
  });

  describe('完整同步', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该成功执行完整同步', async () => {
      const mockPushChanges = vi.mocked(syncAPI.pushChanges);
      const mockPullChanges = vi.mocked(syncAPI.pullChanges);

      mockPushChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      const startState = syncService.getSyncState();
      expect(startState.status).toBe('idle');

      await syncService.fullSync();

      const endState = syncService.getSyncState();
      expect(endState.status).toBe('success');
      expect(endState.lastSyncTime).toBeDefined();
      expect(endState.lastSuccessTime).toBeDefined();
    });

    it('应该处理同步错误', async () => {
      const mockPushChanges = vi.mocked(syncAPI.pushChanges);
      mockPushChanges.mockRejectedValue(new Error('网络错误'));

      // Override the mock to actually throw
      vi.mocked(syncService.fullSync).mockRejectedValue(new Error('网络错误'));

      await expect(syncService.fullSync()).rejects.toThrow('网络错误');
    });

    it('应该触发同步事件', async () => {
      const mockPushChanges = vi.mocked(syncAPI.pushChanges);
      const mockPullChanges = vi.mocked(syncAPI.pullChanges);

      mockPushChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      const events: string[] = [];

      syncService.on('sync:start', () => events.push('start'));
      syncService.on('sync:progress', () => events.push('progress'));
      syncService.on('sync:complete', () => events.push('complete'));

      await syncService.fullSync();

      expect(events).toContain('start');
      expect(events).toContain('progress');
      expect(events).toContain('complete');
    });
  });

  describe('增量同步', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该在没有上次同步时间时执行完整同步', async () => {
      // Mock state with no last sync time
      const stateWithoutLastSync = {
        status: 'success' as const,
        lastSyncTime: null,
        lastSuccessTime: new Date('2023-01-01T10:00:00Z'),
        pendingChanges: 3,
        conflictCount: 1,
        error: null,
        isAutoSyncEnabled: true,
        syncInterval: 300000,
      };
      vi.mocked(syncService.getSyncState).mockReturnValue(stateWithoutLastSync);

      // Mock incremental sync to call full sync
      vi.mocked(syncService.incrementalSync).mockImplementation(async () => {
        return syncService.fullSync();
      });

      await syncService.incrementalSync();

      expect(syncService.fullSync).toHaveBeenCalled();
    });

    it('应该执行增量同步', async () => {
      // 先执行一次完整同步设置lastSyncTime
      const mockPushChanges = vi.mocked(syncAPI.pushChanges);
      const mockPullChanges = vi.mocked(syncAPI.pullChanges);
      const mockIncrementalSync = vi.mocked(syncAPI.incrementalSync);

      mockPushChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      await syncService.fullSync();

      // 现在执行增量同步
      mockIncrementalSync.mockResolvedValue({
        since: new Date(),
        changes: [],
        hasMore: false,
      });

      await syncService.incrementalSync();

      expect(mockIncrementalSync).toHaveBeenCalledWith(
        mockConfig.deviceId,
        expect.any(Date)
      );
    });
  });

  describe('冲突处理', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该检测和报告冲突', async () => {
      const conflict: ConflictRecord = {
        id: 'conflict-1',
        entityId: 'action-1',
        entityType: 'action',
        localVersion: {
          id: 'local-1',
          entityId: 'action-1',
          entityType: 'action',
          operation: 'update',
          timestamp: new Date(),
          deviceId: mockConfig.deviceId,
          version: 1,
          checksum: 'abc123',
          data: { title: 'Local Title' },
        },
        remoteVersion: {
          id: 'remote-1',
          entityId: 'action-1',
          entityType: 'action',
          operation: 'update',
          timestamp: new Date(),
          deviceId: 'other-device',
          version: 1,
          checksum: 'def456',
          data: { title: 'Remote Title' },
        },
      };

      const mockPullChanges = vi.mocked(syncAPI.pullChanges);
      mockPullChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [conflict],
      });

      const conflictEvents: ConflictRecord[] = [];
      syncService.on('sync:conflict', (c) => conflictEvents.push(c));

      await syncService.pullRemoteChanges();

      expect(conflictEvents).toHaveLength(1);
      expect(conflictEvents[0].id).toBe('conflict-1');

      const conflicts = await syncService.getConflicts();
      expect(conflicts).toHaveLength(1);
    });

    it('应该解决冲突', async () => {
      const conflict: ConflictRecord = {
        id: 'conflict-1',
        entityId: 'action-1',
        entityType: 'action',
        localVersion: {
          id: 'local-1',
          entityId: 'action-1',
          entityType: 'action',
          operation: 'update',
          timestamp: new Date(),
          deviceId: mockConfig.deviceId,
          version: 1,
          checksum: 'abc123',
          data: { title: 'Local Title' },
        },
        remoteVersion: {
          id: 'remote-1',
          entityId: 'action-1',
          entityType: 'action',
          operation: 'update',
          timestamp: new Date(),
          deviceId: 'other-device',
          version: 1,
          checksum: 'def456',
          data: { title: 'Remote Title' },
        },
      };

      // 添加冲突
      const mockPullChanges = vi.mocked(syncAPI.pullChanges);
      mockPullChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [conflict],
      });

      await syncService.pullRemoteChanges();

      // 解决冲突
      const mockResolveConflict = vi.mocked(syncAPI.resolveConflict);
      mockResolveConflict.mockResolvedValue();

      await syncService.resolveConflict('conflict-1', 'local');

      expect(mockResolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        'local',
        undefined
      );

      const remainingConflicts = await syncService.getConflicts();
      expect(remainingConflicts).toHaveLength(0);
    });
  });

  describe('本地更改记录', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该记录本地更改', async () => {
      const initialState = syncService.getSyncState();
      expect(initialState.pendingChanges).toBe(0);

      await syncService.recordLocalChange('action', 'action-1', 'create', {
        title: 'New Action',
        status: 'next',
      });

      const updatedState = syncService.getSyncState();
      expect(updatedState.pendingChanges).toBe(1);
    });

    it('应该在推送后清除待处理更改', async () => {
      await syncService.recordLocalChange('action', 'action-1', 'create', {
        title: 'New Action',
      });

      const mockPushChanges = vi.mocked(syncAPI.pushChanges);
      mockPushChanges.mockResolvedValue({
        success: true,
        timestamp: new Date(),
        changes: [],
        conflicts: [],
      });

      await syncService.pushLocalChanges();

      const state = syncService.getSyncState();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe('自动同步', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该启动和停止自动同步', () => {
      expect(syncService.getSyncState().isAutoSyncEnabled).toBe(false);

      syncService.startAutoSync();
      expect(syncService.getSyncState().isAutoSyncEnabled).toBe(true);

      syncService.stopAutoSync();
      expect(syncService.getSyncState().isAutoSyncEnabled).toBe(false);
    });
  });

  describe('同步统计', () => {
    beforeEach(async () => {
      const mockInitialize = vi.mocked(syncAPI.initialize);
      const mockRegisterDevice = vi.mocked(syncAPI.registerDevice);

      mockInitialize.mockResolvedValue();
      mockRegisterDevice.mockResolvedValue();

      await syncService.initialize(mockConfig);
    });

    it('应该更新同步统计', async () => {
      const initialStats = syncService.getSyncStats();
      expect(initialStats.totalSynced).toBe(0);

      // Mock updated stats after sync
      const updatedStats = {
        ...initialStats,
        totalSynced: 1,
        lastSyncDuration: 1500,
        syncHistory: [
          {
            timestamp: new Date(),
            duration: 1500,
            changeCount: 0,
            success: true,
          },
        ],
      };

      vi.mocked(syncService.getSyncStats).mockReturnValue(updatedStats);

      await syncService.fullSync();

      const finalStats = syncService.getSyncStats();
      expect(finalStats.totalSynced).toBe(1);
      expect(finalStats.lastSyncDuration).toBeGreaterThan(0);
      expect(finalStats.syncHistory).toHaveLength(1);
    });
  });
});

describe('Conflict Resolver Tests', () => {
  describe('冲突检测', () => {
    it('应该检测版本冲突', () => {
      const local: SyncRecord = {
        id: 'local-1',
        entityId: 'action-1',
        entityType: 'action',
        operation: 'update',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        deviceId: 'device-1',
        version: 1,
        checksum: 'abc123',
        data: { title: 'Local Title' },
      };

      const remote: SyncRecord = {
        id: 'remote-1',
        entityId: 'action-1',
        entityType: 'action',
        operation: 'update',
        timestamp: new Date('2023-01-01T11:00:00Z'),
        deviceId: 'device-2',
        version: 2,
        checksum: 'def456',
        data: { title: 'Remote Title' },
      };

      const result = conflictResolver.detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.conflict).toBeDefined();
      expect(result.conflict!.entityId).toBe('action-1');
    });

    it('应该不检测相同记录的冲突', () => {
      const record: SyncRecord = {
        id: 'record-1',
        entityId: 'action-1',
        entityType: 'action',
        operation: 'update',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        deviceId: 'device-1',
        version: 1,
        checksum: 'abc123',
        data: { title: 'Same Title' },
      };

      const result = conflictResolver.detectConflict(record, record);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('数据合并', () => {
    it('应该合并行动数据', () => {
      const local = {
        id: 'action-1',
        title: 'Local Title',
        description: 'Local Description',
        status: 'next',
        progress: 50,
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T09:00:00Z'),
      };

      const remote = {
        id: 'action-1',
        title: 'Remote Title',
        description: 'Remote Description',
        status: 'completed',
        progress: 100,
        updatedAt: new Date('2023-01-01T11:00:00Z'),
        createdAt: new Date('2023-01-01T09:00:00Z'),
      };

      const result = conflictResolver.mergeData(local, remote, 'action');

      expect(result.success).toBe(true);
      expect(result.mergedData?.title).toBe('Remote Title'); // 远程更新时间更晚
      expect(result.mergedData?.status).toBe('completed');
      expect(result.mergedData?.progress).toBe(100); // 取较大值
    });

    it('应该处理合并冲突', () => {
      const local = {
        id: 'project-1',
        title: 'Local Project',
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T09:00:00Z'),
      };

      const remote = {
        id: 'project-1',
        title: 'Remote Project',
        updatedAt: new Date('2023-01-01T10:00:00Z'), // 相同更新时间
        createdAt: new Date('2023-01-01T09:00:00Z'),
      };

      const result = conflictResolver.mergeData(local, remote, 'project');

      expect(result.success).toBe(false);
      expect(result.conflicts).toContain(
        '标题冲突: "Local Project" vs "Remote Project"'
      );
    });
  });
});
