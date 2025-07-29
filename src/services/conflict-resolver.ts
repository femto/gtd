/**
 * 冲突检测和解决服务
 * 处理数据同步过程中的冲突检测和解决
 */

import type {
  SyncRecord,
  ConflictRecord,
  DataType,
  SyncOperation,
} from '../types/sync';
import type { BaseEntity } from '../types/interfaces';
import { generateId } from '../utils/validation';

/**
 * 冲突解决策略枚举
 */
export const ConflictResolutionStrategy = {
  LAST_WRITE_WINS: 'last_write_wins',
  FIRST_WRITE_WINS: 'first_write_wins',
  MANUAL: 'manual',
  MERGE: 'merge',
} as const;

export type ConflictResolutionStrategy =
  (typeof ConflictResolutionStrategy)[keyof typeof ConflictResolutionStrategy];

/**
 * 冲突检测结果接口
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict?: ConflictRecord;
  canAutoResolve: boolean;
  suggestedResolution?: 'local' | 'remote' | 'merge';
}

/**
 * 合并结果接口
 */
export interface MergeResult<T = any> {
  success: boolean;
  mergedData?: T;
  conflicts: string[];
  warnings: string[];
}

/**
 * 冲突解决器接口
 */
export interface IConflictResolver {
  /**
   * 检测冲突
   */
  detectConflict(
    local: SyncRecord,
    remote: SyncRecord
  ): ConflictDetectionResult;

  /**
   * 自动解决冲突
   */
  autoResolve(
    conflict: ConflictRecord,
    strategy: ConflictResolutionStrategy
  ): Promise<SyncRecord | null>;

  /**
   * 合并数据
   */
  mergeData<T extends BaseEntity>(
    local: T,
    remote: T,
    entityType: DataType
  ): MergeResult<T>;

  /**
   * 验证解决方案
   */
  validateResolution(conflict: ConflictRecord, resolution: SyncRecord): boolean;
}

/**
 * 默认冲突解决器实现
 */
export class DefaultConflictResolver implements IConflictResolver {
  detectConflict(
    local: SyncRecord,
    remote: SyncRecord
  ): ConflictDetectionResult {
    // 检查是否为同一实体
    if (
      local.entityId !== remote.entityId ||
      local.entityType !== remote.entityType
    ) {
      return { hasConflict: false, canAutoResolve: false };
    }

    // 检查版本冲突
    const hasVersionConflict =
      local.version !== remote.version &&
      local.timestamp.getTime() !== remote.timestamp.getTime();

    if (!hasVersionConflict) {
      return { hasConflict: false, canAutoResolve: false };
    }

    // 创建冲突记录
    const conflict: ConflictRecord = {
      id: generateId(),
      entityId: local.entityId,
      entityType: local.entityType,
      localVersion: local,
      remoteVersion: remote,
    };

    // 判断是否可以自动解决
    const canAutoResolve = this.canAutoResolveConflict(local, remote);
    const suggestedResolution = this.suggestResolution(local, remote);

    return {
      hasConflict: true,
      conflict,
      canAutoResolve,
      suggestedResolution,
    };
  }

  async autoResolve(
    conflict: ConflictRecord,
    strategy: ConflictResolutionStrategy
  ): Promise<SyncRecord | null> {
    const { localVersion, remoteVersion } = conflict;

    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return localVersion.timestamp > remoteVersion.timestamp
          ? localVersion
          : remoteVersion;

      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return localVersion.timestamp < remoteVersion.timestamp
          ? localVersion
          : remoteVersion;

      case ConflictResolutionStrategy.MERGE:
        return this.attemptAutoMerge(conflict);

      case ConflictResolutionStrategy.MANUAL:
      default:
        return null; // 需要手动解决
    }
  }

  mergeData<T extends BaseEntity>(
    local: T,
    remote: T,
    entityType: DataType
  ): MergeResult<T> {
    try {
      switch (entityType) {
        case 'action':
          return this.mergeActionData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        case 'project':
          return this.mergeProjectData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        case 'context':
          return this.mergeContextData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        case 'inbox_item':
          return this.mergeInboxItemData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        case 'waiting_item':
          return this.mergeWaitingItemData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        case 'calendar_item':
          return this.mergeCalendarItemData(
            local as any,
            remote as any
          ) as MergeResult<T>;

        default:
          return this.mergeGenericData(local, remote);
      }
    } catch (error) {
      return {
        success: false,
        conflicts: [
          `合并失败: ${error instanceof Error ? error.message : '未知错误'}`,
        ],
        warnings: [],
      };
    }
  }

  validateResolution(
    conflict: ConflictRecord,
    resolution: SyncRecord
  ): boolean {
    // 验证解决方案是否有效
    if (resolution.entityId !== conflict.entityId) {
      return false;
    }

    if (resolution.entityType !== conflict.entityType) {
      return false;
    }

    // 验证数据完整性
    if (!resolution.data || typeof resolution.data !== 'object') {
      return false;
    }

    return true;
  }

  private canAutoResolveConflict(
    local: SyncRecord,
    remote: SyncRecord
  ): boolean {
    // 如果一个是删除操作，另一个是更新操作，通常需要手动解决
    if ((local.operation === 'delete') !== (remote.operation === 'delete')) {
      return false;
    }

    // 如果时间差异很大，可能需要手动检查
    const timeDiff = Math.abs(
      local.timestamp.getTime() - remote.timestamp.getTime()
    );
    const oneHour = 60 * 60 * 1000;

    if (timeDiff > oneHour) {
      return false;
    }

    return true;
  }

  private suggestResolution(
    local: SyncRecord,
    remote: SyncRecord
  ): 'local' | 'remote' | 'merge' {
    // 如果一个是删除操作
    if (local.operation === 'delete' && remote.operation !== 'delete') {
      return 'local'; // 保持删除
    }

    if (remote.operation === 'delete' && local.operation !== 'delete') {
      return 'remote'; // 保持删除
    }

    // 基于时间戳建议
    if (local.timestamp > remote.timestamp) {
      return 'local';
    } else if (remote.timestamp > local.timestamp) {
      return 'remote';
    }

    // 时间相同，尝试合并
    return 'merge';
  }

  private async attemptAutoMerge(
    conflict: ConflictRecord
  ): Promise<SyncRecord | null> {
    const { localVersion, remoteVersion, entityType } = conflict;

    if (!localVersion.data || !remoteVersion.data) {
      return null;
    }

    const mergeResult = this.mergeData(
      localVersion.data,
      remoteVersion.data,
      entityType
    );

    if (!mergeResult.success || mergeResult.conflicts.length > 0) {
      return null;
    }

    // 创建合并后的同步记录
    return {
      id: generateId(),
      entityId: conflict.entityId,
      entityType: conflict.entityType,
      operation: 'update' as SyncOperation,
      timestamp: new Date(),
      deviceId: localVersion.deviceId,
      version: Math.max(localVersion.version, remoteVersion.version) + 1,
      checksum: this.calculateChecksum(mergeResult.mergedData),
      data: mergeResult.mergedData,
    };
  }

  private mergeActionData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    // 合并标题
    if (local.title !== remote.title) {
      if (local.updatedAt > remote.updatedAt) {
        merged.title = local.title;
        warnings.push(`使用本地标题: "${local.title}"`);
      } else {
        merged.title = remote.title;
        warnings.push(`使用远程标题: "${remote.title}"`);
      }
    }

    // 合并状态 - 优先保持更新的状态
    if (local.status !== remote.status) {
      if (local.updatedAt > remote.updatedAt) {
        merged.status = local.status;
      } else {
        merged.status = remote.status;
      }
    }

    // 合并进度 - 取较大值
    if (local.progress !== remote.progress) {
      merged.progress = Math.max(local.progress || 0, remote.progress || 0);
    }

    // 合并描述和备注
    merged.description = this.mergeText(local.description, remote.description);
    merged.notes = this.mergeText(local.notes, remote.notes);

    // 合并标签
    merged.tags = this.mergeTags(local.tags, remote.tags);

    return {
      success: true,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeProjectData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    // 合并基本字段
    if (local.title !== remote.title) {
      conflicts.push(`标题冲突: "${local.title}" vs "${remote.title}"`);
    }

    if (local.status !== remote.status) {
      if (local.updatedAt > remote.updatedAt) {
        merged.status = local.status;
      } else {
        merged.status = remote.status;
      }
    }

    merged.description = this.mergeText(local.description, remote.description);
    merged.notes = this.mergeText(local.notes, remote.notes);
    merged.tags = this.mergeTags(local.tags, remote.tags);

    return {
      success: conflicts.length === 0,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeContextData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    if (local.name !== remote.name) {
      conflicts.push(`名称冲突: "${local.name}" vs "${remote.name}"`);
    }

    if (local.color !== remote.color) {
      merged.color =
        local.updatedAt > remote.updatedAt ? local.color : remote.color;
    }

    merged.description = this.mergeText(local.description, remote.description);

    return {
      success: conflicts.length === 0,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeInboxItemData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    if (local.content !== remote.content) {
      conflicts.push(`内容冲突: "${local.content}" vs "${remote.content}"`);
    }

    if (local.processed !== remote.processed) {
      // 优先保持已处理状态
      merged.processed = local.processed || remote.processed;
    }

    return {
      success: conflicts.length === 0,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeWaitingItemData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    if (local.title !== remote.title) {
      conflicts.push(`标题冲突: "${local.title}" vs "${remote.title}"`);
    }

    if (local.waitingFor !== remote.waitingFor) {
      merged.waitingFor =
        local.updatedAt > remote.updatedAt
          ? local.waitingFor
          : remote.waitingFor;
    }

    merged.description = this.mergeText(local.description, remote.description);
    merged.notes = this.mergeText(local.notes, remote.notes);

    return {
      success: conflicts.length === 0,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeCalendarItemData(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const merged = { ...local };

    if (local.title !== remote.title) {
      conflicts.push(`标题冲突: "${local.title}" vs "${remote.title}"`);
    }

    if (local.startTime?.getTime() !== remote.startTime?.getTime()) {
      conflicts.push(`开始时间冲突`);
    }

    if (local.endTime?.getTime() !== remote.endTime?.getTime()) {
      conflicts.push(`结束时间冲突`);
    }

    merged.description = this.mergeText(local.description, remote.description);

    return {
      success: conflicts.length === 0,
      mergedData: merged,
      conflicts,
      warnings,
    };
  }

  private mergeGenericData<T extends BaseEntity>(
    local: T,
    remote: T
  ): MergeResult<T> {
    const merged = { ...local };

    // 使用更新时间较新的数据
    if (remote.updatedAt > local.updatedAt) {
      Object.assign(merged, remote);
    }

    return {
      success: true,
      mergedData: merged,
      conflicts: [],
      warnings: ['使用通用合并策略'],
    };
  }

  private mergeText(local?: string, remote?: string): string | undefined {
    if (!local && !remote) return undefined;
    if (!local) return remote;
    if (!remote) return local;
    if (local === remote) return local;

    // 简单合并：如果不同，返回较长的文本
    return local.length >= remote.length ? local : remote;
  }

  private mergeTags(local?: string[], remote?: string[]): string[] | undefined {
    if (!local && !remote) return undefined;
    if (!local) return remote;
    if (!remote) return local;

    // 合并标签并去重
    const merged = [...new Set([...local, ...remote])];
    return merged.length > 0 ? merged : undefined;
  }

  private calculateChecksum(data: any): string {
    // 简单的校验和计算
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }
}

// 导出默认实例
export const conflictResolver = new DefaultConflictResolver();
