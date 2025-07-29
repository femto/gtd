/**
 * 数据同步相关类型定义
 * 定义同步功能所需的接口和类型
 */

import type { BaseEntity } from './interfaces';

/**
 * 同步状态枚举
 */
export const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICT: 'conflict',
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

/**
 * 同步操作类型枚举
 */
export const SyncOperation = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type SyncOperation = (typeof SyncOperation)[keyof typeof SyncOperation];

/**
 * 数据类型枚举
 */
export const DataType = {
  INBOX_ITEM: 'inbox_item',
  ACTION: 'action',
  PROJECT: 'project',
  CONTEXT: 'context',
  WAITING_ITEM: 'waiting_item',
  CALENDAR_ITEM: 'calendar_item',
} as const;

export type DataType = (typeof DataType)[keyof typeof DataType];

/**
 * 设备信息接口
 */
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  lastSeen: Date;
  isActive: boolean;
}

/**
 * 同步记录接口
 */
export interface SyncRecord {
  id: string;
  entityId: string;
  entityType: DataType;
  operation: SyncOperation;
  timestamp: Date;
  deviceId: string;
  version: number;
  checksum: string;
  data?: any;
}

/**
 * 冲突记录接口
 */
export interface ConflictRecord {
  id: string;
  entityId: string;
  entityType: DataType;
  localVersion: SyncRecord;
  remoteVersion: SyncRecord;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: 'local' | 'remote' | 'merge';
}

/**
 * 同步状态接口
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  lastSuccessTime: Date | null;
  pendingChanges: number;
  conflictCount: number;
  error: string | null;
  isAutoSyncEnabled: boolean;
  syncInterval: number; // 自动同步间隔(毫秒)
}

/**
 * 同步配置接口
 */
export interface SyncConfig {
  apiEndpoint: string;
  apiKey?: string;
  deviceId: string;
  autoSync: boolean;
  syncInterval: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
}

/**
 * 同步请求接口
 */
export interface SyncRequest {
  deviceId: string;
  lastSyncTime?: Date;
  changes: SyncRecord[];
}

/**
 * 同步响应接口
 */
export interface SyncResponse {
  success: boolean;
  timestamp: Date;
  changes: SyncRecord[];
  conflicts: ConflictRecord[];
  nextSyncTime?: Date;
  error?: string;
}

/**
 * 增量同步数据接口
 */
export interface IncrementalSyncData {
  since: Date;
  changes: SyncRecord[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * 同步统计接口
 */
export interface SyncStats {
  totalSynced: number;
  totalConflicts: number;
  lastSyncDuration: number;
  averageSyncTime: number;
  syncHistory: Array<{
    timestamp: Date;
    duration: number;
    changeCount: number;
    success: boolean;
  }>;
}

/**
 * 可同步实体接口
 */
export interface SyncableEntity extends BaseEntity {
  version: number;
  checksum: string;
  lastSyncTime?: Date;
  deviceId?: string;
}
