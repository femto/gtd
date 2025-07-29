/**
 * 任务过滤器组件
 * 提供按情境、优先级、标签等条件过滤任务的功能
 * 支持多维度过滤和快捷键操作
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { FilterCriteria, Context } from '../../types/interfaces';
import { Priority, ActionStatus } from '../../types/enums';
import { actionDao } from '../../database/dao/action-dao';

interface ActionFiltersProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  contexts: Context[];
  onQuickFilter?: (filterType: string) => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export const ActionFilters: React.FC<ActionFiltersProps> = ({
  criteria,
  onChange,
  contexts,
  onQuickFilter,
  showAdvanced = false,
  onToggleAdvanced,
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickFilterMode, setQuickFilterMode] = useState(false);

  // 加载可用标签
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        const tags = await actionDao.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('加载标签失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTags();
  }, []);

  // 快捷键处理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 只在快速过滤模式下处理快捷键
      if (!quickFilterMode) return;

      // 检查是否按下了 Ctrl/Cmd + 数字键
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key >= '1' &&
        event.key <= '9'
      ) {
        event.preventDefault();
        const keyNumber = parseInt(event.key);

        switch (keyNumber) {
          case 1: // Ctrl+1: 今日任务
            applyQuickFilter('today');
            break;
          case 2: // Ctrl+2: 高优先级
            applyQuickFilter('high-priority');
            break;
          case 3: // Ctrl+3: 等待中
            applyQuickFilter('waiting');
            break;
          case 4: // Ctrl+4: 过期任务
            applyQuickFilter('overdue');
            break;
          case 5: // Ctrl+5: 无情境
            applyQuickFilter('no-context');
            break;
          case 0: // Ctrl+0: 清除所有过滤器
            clearAllFilters();
            break;
        }
      }

      // Alt + F: 切换快速过滤模式
      if (event.altKey && event.key === 'f') {
        event.preventDefault();
        setQuickFilterMode(!quickFilterMode);
      }

      // Escape: 退出快速过滤模式
      if (event.key === 'Escape' && quickFilterMode) {
        setQuickFilterMode(false);
      }
    },
    [quickFilterMode]
  );

  // 注册键盘事件监听器
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 应用快速过滤器
  const applyQuickFilter = (filterType: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    switch (filterType) {
      case 'today':
        onChange({
          statuses: [ActionStatus.NEXT],
          dateRange: { start: today, end: tomorrow },
        });
        break;
      case 'high-priority':
        onChange({
          priorities: [Priority.HIGH, Priority.URGENT],
          statuses: [ActionStatus.NEXT],
        });
        break;
      case 'waiting':
        onChange({
          statuses: [ActionStatus.WAITING],
        });
        break;
      case 'overdue':
        onChange({
          statuses: [ActionStatus.NEXT],
          dateRange: { end: now },
        });
        break;
      case 'no-context':
        onChange({
          statuses: [ActionStatus.NEXT],
          contexts: [],
        });
        break;
    }

    if (onQuickFilter) {
      onQuickFilter(filterType);
    }
  };

  // 清除所有过滤器
  const clearAllFilters = () => {
    onChange({});
  };

  const handleContextChange = (contextId: string, checked: boolean) => {
    const currentContexts = criteria.contexts || [];
    const newContexts = checked
      ? [...currentContexts, contextId]
      : currentContexts.filter((id) => id !== contextId);

    onChange({
      ...criteria,
      contexts: newContexts.length > 0 ? newContexts : undefined,
    });
  };

  const handlePriorityChange = (priority: Priority, checked: boolean) => {
    const currentPriorities = criteria.priorities || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter((p) => p !== priority);

    onChange({
      ...criteria,
      priorities: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    const currentTags = criteria.tags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter((t) => t !== tag);

    onChange({
      ...criteria,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleStatusChange = (status: ActionStatus, checked: boolean) => {
    const currentStatuses = criteria.statuses || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter((s) => s !== status);

    onChange({
      ...criteria,
      statuses: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : undefined;
    const currentRange = criteria.dateRange || {
      start: undefined,
      end: undefined,
    };

    const newRange = {
      ...currentRange,
      [field]: date,
    };

    // 如果开始和结束日期都为空，则移除日期范围过滤
    if (!newRange.start && !newRange.end) {
      const { dateRange, ...rest } = criteria;
      onChange(rest);
    } else {
      onChange({
        ...criteria,
        dateRange: newRange,
      });
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return '紧急';
      case Priority.HIGH:
        return '高';
      case Priority.MEDIUM:
        return '中';
      case Priority.LOW:
        return '低';
      default:
        return '未知';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'text-red-600 bg-red-50 border-red-200';
      case Priority.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case Priority.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case Priority.LOW:
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: ActionStatus) => {
    switch (status) {
      case ActionStatus.NEXT:
        return '下一步';
      case ActionStatus.WAITING:
        return '等待中';
      case ActionStatus.SCHEDULED:
        return '已安排';
      case ActionStatus.COMPLETED:
        return '已完成';
      case ActionStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case ActionStatus.NEXT:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ActionStatus.WAITING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ActionStatus.SCHEDULED:
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case ActionStatus.COMPLETED:
        return 'text-green-600 bg-green-50 border-green-200';
      case ActionStatus.CANCELLED:
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">
      {/* 快速过滤器提示 */}
      {quickFilterMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">快速过滤模式</h4>
            <button
              onClick={() => setQuickFilterMode(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Ctrl+1: 今日任务 | Ctrl+2: 高优先级 | Ctrl+3: 等待中</div>
            <div>Ctrl+4: 过期任务 | Ctrl+5: 无情境 | Ctrl+0: 清除过滤器</div>
          </div>
        </div>
      )}

      {/* 快速过滤按钮 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">快速过滤</h3>
          <button
            onClick={() => setQuickFilterMode(!quickFilterMode)}
            className={`text-xs px-2 py-1 rounded ${
              quickFilterMode
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Alt+F 切换快速模式"
          >
            {quickFilterMode ? '快速模式' : '启用快捷键'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyQuickFilter('today')}
            className="text-xs px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
          >
            今日任务
          </button>
          <button
            onClick={() => applyQuickFilter('high-priority')}
            className="text-xs px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-md transition-colors"
          >
            高优先级
          </button>
          <button
            onClick={() => applyQuickFilter('waiting')}
            className="text-xs px-3 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-md transition-colors"
          >
            等待中
          </button>
          <button
            onClick={() => applyQuickFilter('overdue')}
            className="text-xs px-3 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-md transition-colors"
          >
            过期任务
          </button>
        </div>
        <div className="mt-2">
          <button
            onClick={clearAllFilters}
            className="w-full text-xs px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            清除所有过滤器
          </button>
        </div>
      </div>

      {/* 高级过滤器切换 */}
      {onToggleAdvanced && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={onToggleAdvanced}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-900"
          >
            <span>高级过滤器</span>
            <svg
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* 高级过滤器内容 */}
      {showAdvanced && (
        <>
          {/* 情境过滤 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              按情境过滤
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {contexts
                .filter((context) => context.isActive)
                .map((context) => (
                  <label key={context.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={criteria.contexts?.includes(context.id) || false}
                      onChange={(e) =>
                        handleContextChange(context.id, e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 flex items-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: context.color }}
                      />
                      {context.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          {/* 状态过滤 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              按状态过滤
            </h3>
            <div className="space-y-2">
              {Object.values(ActionStatus).map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={criteria.statuses?.includes(status) || false}
                    onChange={(e) =>
                      handleStatusChange(status, e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 优先级过滤 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              按优先级过滤
            </h3>
            <div className="space-y-2">
              {Object.values(Priority).map((priority) => (
                <label key={priority} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={criteria.priorities?.includes(priority) || false}
                    onChange={(e) =>
                      handlePriorityChange(priority, e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}
                  >
                    {getPriorityLabel(priority)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 标签过滤 */}
          {availableTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                按标签过滤
              </h3>
              {isLoading ? (
                <div className="text-sm text-gray-500">加载标签中...</div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={criteria.tags?.includes(tag) || false}
                        onChange={(e) => handleTagChange(tag, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">#{tag}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 日期范围过滤 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              按截止日期过滤
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={formatDateForInput(criteria.dateRange?.start)}
                  onChange={(e) =>
                    handleDateRangeChange('start', e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={formatDateForInput(criteria.dateRange?.end)}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 过滤器统计 */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          已选择:{' '}
          {(criteria.contexts?.length || 0) +
            (criteria.priorities?.length || 0) +
            (criteria.statuses?.length || 0) +
            (criteria.tags?.length || 0) +
            (criteria.dateRange ? 1 : 0)}{' '}
          个过滤条件
        </div>
      </div>
    </div>
  );
};
