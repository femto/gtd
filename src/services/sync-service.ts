/**
 * 数据同步服务
 * 协调本地数据与云端的同步过程
 */

import type {
  SyncConfig,
  SyncState,
  SyncRecord,
  // SyncStatus,
  DataType,
  DeviceInfo,
  ConflictRecord,
  SyncStats,
} from '../types/sync';
// import type { BaseEntity } from '../types/interfaces';
import { syncAPI } from './sync-api';
import { conflictResolver } from './conflict-resolver';
import { generateId } from '../utils/validation';
import { db } from '../database/schema';

/**
 * 同步事件接口
 */
export interface SyncEvents {
  'sync:start': () => void;
  'sync:progress': (progress: {
    current: number;
    total: number;
    message: string;
  }) => void;
  'sync:conflict': (conflict: ConflictRecord) => void;
  'sync:complete': (stats: SyncStats) => void;
  'sync:error': (error: Error) => void;
}

/**
 * 同步服务接口
 */
export interface ISyncService {
  /**
   * 初始化同步服务
   */
  initialize(config: SyncConfig): Promise<void>;

  /**
   * 执行完整同步
   */
  fullSync(): Promise<void>;

  /**
   * 执行增量同步
   */
  incrementalSync(): Promise<void>;

  /**
   * 推送本地更改
   */
  pushLocalChanges(): Promise<void>;

  /**
   * 拉取远程更改
   */
  pullRemoteChanges(): Promise<void>;

  /**
   * 启动自动同步
   */
  startAutoSync(): void;

  /**
   * 停止自动同步
   */
  stopAutoSync(): void;

  /**
   * 获取同步状态
   */
  getSyncState(): SyncState;

  /**
   * 获取同步统计
   */
  getSyncStats(): SyncStats;

  /**
   * 解决冲突
   */
  resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    data?: any
  ): Promise<void>;

  /**
   * 获取冲突列表
   */
  getConflicts(): Promise<ConflictRecord[]>;

  /**
   * 注册事件监听器
   */
  on<K extends keyof SyncEvents>(event: K, listener: SyncEvents[K]): void;

  /**
   * 移除事件监听器
   */
  off<K extends keyof SyncEvents>(event: K, listener: SyncEvents[K]): void;
}

/**
 * 同步服务实现
 */
export class SyncService implements ISyncService {
  private config: SyncConfig | null = null;
  private syncState: SyncState;
  private syncStats: SyncStats;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<keyof SyncEvents, Function[]> = new Map();
  private pendingChanges: Map<string, SyncRecord> = new Map();
  private conflicts: ConflictRecord[] = [];

  constructor() {
    this.syncState = {
      status: 'idle',
      lastSyncTime: null,
      lastSuccessTime: null,
      pendingChanges: 0,
      conflictCount: 0,
      error: null,
      isAutoSyncEnabled: false,
      syncInterval: 5 * 60 * 1000, // 5分钟
    };

    this.syncStats = {
      totalSynced: 0,
      totalConflicts: 0,
      lastSyncDuration: 0,
      averageSyncTime: 0,
      syncHistory: [],
    };
  }

  async initialize(config: SyncConfig): Promise<void> {
    this.config = config;
    this.syncState.syncInterval = config.syncInterval;
    this.syncState.isAutoSyncEnabled = config.autoSync;

    // 初始化同步API
    await syncAPI.initialize(config);

    // 注册设备
    await this.registerCurrentDevice();

    // 加载本地同步状态
    await this.loadSyncState();

    // 启动自动同步
    if (config.autoSync) {
      this.startAutoSync();
    }
  }

  async fullSync(): Promise<void> {
    if (this.syncState.status === 'syncing') {
      throw new Error('同步正在进行中');
    }

    const startTime = Date.now();
    this.updateSyncState({ status: 'syncing', error: null });
    this.emit('sync:start');

    try {
      // 1. 推送本地更改
      this.emit('sync:progress', {
        current: 1,
        total: 4,
        message: '推送本地更改...',
      });
      await this.pushLocalChanges();

      // 2. 拉取远程更改
      this.emit('sync:progress', {
        current: 2,
        total: 4,
        message: '拉取远程更改...',
      });
      await this.pullRemoteChanges();

      // 3. 处理冲突
      this.emit('sync:progress', {
        current: 3,
        total: 4,
        message: '处理冲突...',
      });
      await this.processConflicts();

      // 4. 完成同步
      this.emit('sync:progress', {
        current: 4,
        total: 4,
        message: '完成同步...',
      });

      const duration = Date.now() - startTime;
      this.updateSyncStats(duration, true);
      this.updateSyncState({
        status: 'success',
        lastSyncTime: new Date(),
        lastSuccessTime: new Date(),
        pendingChanges: 0,
      });

      this.emit('sync:complete', this.syncStats);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateSyncStats(duration, false);
      this.updateSyncState({
        status: 'error',
        error: error instanceof Error ? error.message : '同步失败',
      });

      this.emit(
        'sync:error',
        error instanceof Error ? error : new Error('同步失败')
      );
      throw error;
    }
  }

  async incrementalSync(): Promise<void> {
    if (!this.syncState.lastSyncTime) {
      return this.fullSync();
    }

    const startTime = Date.now();
    this.updateSyncState({ status: 'syncing', error: null });

    try {
      const deviceId = await this.getDeviceId();
      const incrementalData = await syncAPI.incrementalSync(
        deviceId,
        this.syncState.lastSyncTime
      );

      // 处理增量更改
      if (incrementalData && incrementalData.changes) {
        for (const change of incrementalData.changes) {
          await this.applyRemoteChange(change);
        }
      }

      const duration = Date.now() - startTime;
      this.updateSyncStats(duration, true);
      this.updateSyncState({
        status: 'success',
        lastSyncTime: new Date(),
        lastSuccessTime: new Date(),
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateSyncStats(duration, false);
      this.updateSyncState({
        status: 'error',
        error: error instanceof Error ? error.message : '增量同步失败',
      });
      throw error;
    }
  }

  async pushLocalChanges(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const changes = Array.from(this.pendingChanges.values());

    if (changes.length === 0) {
      return;
    }

    const request = {
      deviceId,
      lastSyncTime: this.syncState.lastSyncTime || undefined,
      changes,
    };

    const response = await syncAPI.pushChanges(request);

    if (response && response.success) {
      // 清除已推送的更改
      this.pendingChanges.clear();
      this.updateSyncState({ pendingChanges: 0 });

      // 处理服务器返回的冲突
      if (response.conflicts) {
        for (const conflict of response.conflicts) {
          this.conflicts.push(conflict);
          this.emit('sync:conflict', conflict);
        }
      }

      this.updateSyncState({ conflictCount: this.conflicts.length });
    } else {
      throw new Error(response?.error || '推送更改失败');
    }
  }

  async pullRemoteChanges(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const response = await syncAPI.pullChanges(
      deviceId,
      this.syncState.lastSyncTime || undefined
    );

    if (response.success) {
      // 应用远程更改
      for (const change of response.changes) {
        await this.applyRemoteChange(change);
      }

      // 处理冲突
      for (const conflict of response.conflicts) {
        this.conflicts.push(conflict);
        this.emit('sync:conflict', conflict);
      }

      this.updateSyncState({ conflictCount: this.conflicts.length });
    } else {
      throw new Error(response.error || '拉取更改失败');
    }
  }

  startAutoSync(): void {
    if (this.autoSyncTimer) {
      this.stopAutoSync();
    }

    this.autoSyncTimer = setInterval(async () => {
      try {
        await this.incrementalSync();
      } catch (error) {
        console.error('自动同步失败:', error);
      }
    }, this.syncState.syncInterval);

    this.updateSyncState({ isAutoSyncEnabled: true });
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    this.updateSyncState({ isAutoSyncEnabled: false });
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    data?: any
  ): Promise<void> {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict) {
      throw new Error('冲突不存在');
    }

    let resolvedData: SyncRecord;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localVersion;
        break;
      case 'remote':
        resolvedData = conflict.remoteVersion;
        break;
      case 'merge':
        if (!data) {
          throw new Error('合并解决方案需要提供数据');
        }
        resolvedData = {
          ...conflict.localVersion,
          data,
          timestamp: new Date(),
          version:
            Math.max(
              conflict.localVersion.version,
              conflict.remoteVersion.version
            ) + 1,
        };
        break;
      default:
        throw new Error('无效的解决方案');
    }

    // 应用解决方案
    await this.applyResolvedChange(resolvedData);

    // 通知服务器
    await syncAPI.resolveConflict(conflictId, resolution, data);

    // 移除冲突
    this.conflicts = this.conflicts.filter((c) => c.id !== conflictId);
    this.updateSyncState({ conflictCount: this.conflicts.length });
  }

  async getConflicts(): Promise<ConflictRecord[]> {
    return [...this.conflicts];
  }

  on<K extends keyof SyncEvents>(event: K, listener: SyncEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off<K extends keyof SyncEvents>(event: K, listener: SyncEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 记录本地更改
   */
  async recordLocalChange(
    entityType: DataType,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    const deviceId = await this.getDeviceId();
    const change: SyncRecord = {
      id: generateId(),
      entityId,
      entityType,
      operation,
      timestamp: new Date(),
      deviceId,
      version: 1, // 将在同步时更新
      checksum: this.calculateChecksum(data),
      data,
    };

    this.pendingChanges.set(`${entityType}:${entityId}`, change);
    this.updateSyncState({ pendingChanges: this.pendingChanges.size });
  }

  private emit<K extends keyof SyncEvents>(
    event: K,
    ...args: Parameters<SyncEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`事件监听器错误 (${event}):`, error);
        }
      });
    }
  }

  private updateSyncState(updates: Partial<SyncState>): void {
    Object.assign(this.syncState, updates);
    this.saveSyncState();
  }

  private updateSyncStats(duration: number, success: boolean): void {
    this.syncStats.lastSyncDuration = duration;

    if (success) {
      this.syncStats.totalSynced++;
    }

    // 更新平均同步时间
    const history = this.syncStats.syncHistory;
    history.push({
      timestamp: new Date(),
      duration,
      changeCount: this.pendingChanges.size,
      success,
    });

    // 保持最近50次记录
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    // 计算平均时间
    const successfulSyncs = history.filter((h) => h.success);
    if (successfulSyncs.length > 0) {
      this.syncStats.averageSyncTime =
        successfulSyncs.reduce((sum, h) => sum + h.duration, 0) /
        successfulSyncs.length;
    }
  }

  private async registerCurrentDevice(): Promise<void> {
    const deviceInfo: DeviceInfo = {
      id: await this.getDeviceId(),
      name: this.getDeviceName(),
      type: this.getDeviceType(),
      platform: navigator.platform,
      lastSeen: new Date(),
      isActive: true,
    };

    await syncAPI.registerDevice(deviceInfo);
  }

  private async getDeviceId(): Promise<string> {
    if (!this.config) {
      throw new Error('同步服务未初始化');
    }
    return this.config.deviceId;
  }

  private getDeviceName(): string {
    return `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`;
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (
      /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      )
    ) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  private async applyRemoteChange(change: SyncRecord): Promise<void> {
    // 检查冲突
    const localChange = this.pendingChanges.get(
      `${change.entityType}:${change.entityId}`
    );
    if (localChange) {
      const conflictResult = conflictResolver.detectConflict(
        localChange,
        change
      );
      if (conflictResult.hasConflict && conflictResult.conflict) {
        this.conflicts.push(conflictResult.conflict);
        this.emit('sync:conflict', conflictResult.conflict);
        return;
      }
    }

    // 应用更改到本地数据库
    await this.applyChangeToDatabase(change);
  }

  private async applyResolvedChange(change: SyncRecord): Promise<void> {
    await this.applyChangeToDatabase(change);
  }

  private async applyChangeToDatabase(change: SyncRecord): Promise<void> {
    const { entityType, entityId, operation, data } = change;

    try {
      switch (entityType) {
        case 'inbox_item':
          await this.applyInboxItemChange(entityId, operation, data);
          break;
        case 'action':
          await this.applyActionChange(entityId, operation, data);
          break;
        case 'project':
          await this.applyProjectChange(entityId, operation, data);
          break;
        case 'context':
          await this.applyContextChange(entityId, operation, data);
          break;
        case 'waiting_item':
          await this.applyWaitingItemChange(entityId, operation, data);
          break;
        case 'calendar_item':
          await this.applyCalendarItemChange(entityId, operation, data);
          break;
      }
    } catch (error) {
      console.error(`应用数据库更改失败 (${entityType}:${entityId}):`, error);
      throw error;
    }
  }

  private async applyInboxItemChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.inboxItems.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.inboxItems.delete(entityId);
        break;
    }
  }

  private async applyActionChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.actions.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.actions.delete(entityId);
        break;
    }
  }

  private async applyProjectChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.projects.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.projects.delete(entityId);
        break;
    }
  }

  private async applyContextChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.contexts.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.contexts.delete(entityId);
        break;
    }
  }

  private async applyWaitingItemChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.waitingItems.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.waitingItems.delete(entityId);
        break;
    }
  }

  private async applyCalendarItemChange(
    entityId: string,
    operation: string,
    data: any
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
        await db.calendarItems.put({ ...data, id: entityId });
        break;
      case 'delete':
        await db.calendarItems.delete(entityId);
        break;
    }
  }

  private async processConflicts(): Promise<void> {
    // 尝试自动解决冲突
    for (const conflict of [...this.conflicts]) {
      try {
        const resolved = await conflictResolver.autoResolve(
          conflict,
          'last_write_wins'
        );
        if (resolved) {
          await this.applyResolvedChange(resolved);
          this.conflicts = this.conflicts.filter((c) => c.id !== conflict.id);
        }
      } catch (error) {
        console.error('自动解决冲突失败:', error);
      }
    }

    this.updateSyncState({ conflictCount: this.conflicts.length });
  }

  private calculateChecksum(data: any): string {
    if (!data) return '';
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private async loadSyncState(): Promise<void> {
    try {
      const stored = localStorage.getItem('gtd-sync-state');
      if (stored) {
        const state = JSON.parse(stored);
        Object.assign(this.syncState, state);
      }
    } catch (error) {
      console.error('加载同步状态失败:', error);
    }
  }

  private saveSyncState(): void {
    try {
      localStorage.setItem('gtd-sync-state', JSON.stringify(this.syncState));
    } catch (error) {
      console.error('保存同步状态失败:', error);
    }
  }
}

// 导出默认实例
export const syncService = new SyncService();
