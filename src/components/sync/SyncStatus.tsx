/**
 * 同步状态显示组件
 * 显示当前同步状态和统计信息
 */

import React, { useState, useEffect } from 'react';
import { syncService } from '../../services/sync-service';
import type { SyncState, SyncStats, ConflictRecord } from '../../types/sync';

interface SyncStatusProps {
  onManualSync?: () => void;
  onResolveConflict?: (conflictId: string) => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  onManualSync,
  onResolveConflict,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(
    syncService.getSyncState()
  );
  const [syncStats, setSyncStats] = useState<SyncStats>(
    syncService.getSyncStats()
  );
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // 监听同步事件
    const handleSyncStart = () => {
      setSyncState(syncService.getSyncState());
    };

    const handleSyncComplete = (stats: SyncStats) => {
      setSyncState(syncService.getSyncState());
      setSyncStats(stats);
      setIsManualSyncing(false);
    };

    const handleSyncError = () => {
      setSyncState(syncService.getSyncState());
      setIsManualSyncing(false);
    };

    const handleSyncConflict = async () => {
      const conflictList = await syncService.getConflicts();
      setConflicts(conflictList);
      setSyncState(syncService.getSyncState());
    };

    syncService.on('sync:start', handleSyncStart);
    syncService.on('sync:complete', handleSyncComplete);
    syncService.on('sync:error', handleSyncError);
    syncService.on('sync:conflict', handleSyncConflict);

    // 初始加载冲突
    loadConflicts();

    return () => {
      syncService.off('sync:start', handleSyncStart);
      syncService.off('sync:complete', handleSyncComplete);
      syncService.off('sync:error', handleSyncError);
      syncService.off('sync:conflict', handleSyncConflict);
    };
  }, []);

  const loadConflicts = async () => {
    try {
      const conflictList = await syncService.getConflicts();
      setConflicts(conflictList);
    } catch (error) {
      console.error('加载冲突列表失败:', error);
    }
  };

  const handleManualSync = async () => {
    if (isManualSyncing || syncState.status === 'syncing') {
      return;
    }

    setIsManualSyncing(true);
    try {
      await syncService.fullSync();
      if (onManualSync) {
        onManualSync();
      }
    } catch (error) {
      console.error('手动同步失败:', error);
    }
  };

  const handleToggleAutoSync = () => {
    if (syncState.isAutoSyncEnabled) {
      syncService.stopAutoSync();
    } else {
      syncService.startAutoSync();
    }
    setSyncState(syncService.getSyncState());
  };

  const getStatusIcon = () => {
    switch (syncState.status) {
      case 'syncing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'conflict':
        return '⚠️';
      default:
        return '⏸️';
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case 'syncing':
        return '同步中...';
      case 'success':
        return '同步成功';
      case 'error':
        return '同步失败';
      case 'conflict':
        return '存在冲突';
      default:
        return '未同步';
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case 'syncing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'conflict':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatLastSyncTime = (date: Date | null) => {
    if (!date) return '从未同步';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}min`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* 主要状态显示 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
            <p className="text-sm text-gray-500">
              上次同步: {formatLastSyncTime(syncState.lastSyncTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing || syncState.status === 'syncing'}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isManualSyncing || syncState.status === 'syncing'
              ? '同步中...'
              : '立即同步'}
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showDetails ? '隐藏详情' : '显示详情'}
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {syncState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">{syncState.error}</p>
        </div>
      )}

      {/* 冲突警告 */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              发现 {conflicts.length} 个数据冲突需要解决
            </p>
            <button
              onClick={() =>
                onResolveConflict && onResolveConflict(conflicts[0].id)
              }
              className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
            >
              解决冲突
            </button>
          </div>
        </div>
      )}

      {/* 快速状态指示器 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {syncState.pendingChanges}
          </div>
          <div className="text-xs text-gray-500">待同步更改</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {syncStats.totalSynced}
          </div>
          <div className="text-xs text-gray-500">总同步次数</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {conflicts.length}
          </div>
          <div className="text-xs text-gray-500">待解决冲突</div>
        </div>
      </div>

      {/* 自动同步开关 */}
      <div className="flex items-center justify-between py-2 border-t border-gray-100">
        <span className="text-sm text-gray-700">自动同步</span>
        <button
          onClick={handleToggleAutoSync}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            syncState.isAutoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              syncState.isAutoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">上次成功同步:</span>
              <div className="font-medium">
                {formatLastSyncTime(syncState.lastSuccessTime)}
              </div>
            </div>

            <div>
              <span className="text-gray-500">同步间隔:</span>
              <div className="font-medium">
                {Math.floor(syncState.syncInterval / 60000)}分钟
              </div>
            </div>

            <div>
              <span className="text-gray-500">上次同步耗时:</span>
              <div className="font-medium">
                {formatDuration(syncStats.lastSyncDuration)}
              </div>
            </div>

            <div>
              <span className="text-gray-500">平均同步时间:</span>
              <div className="font-medium">
                {formatDuration(syncStats.averageSyncTime)}
              </div>
            </div>
          </div>

          {/* 同步历史 */}
          {syncStats.syncHistory.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                最近同步记录
              </h4>
              <div className="space-y-1">
                {syncStats.syncHistory
                  .slice(-5)
                  .reverse()
                  .map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-500">
                        {record.timestamp.toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={
                            record.success ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {record.success ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-500">
                          {formatDuration(record.duration)}
                        </span>
                        <span className="text-gray-500">
                          {record.changeCount} 更改
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
