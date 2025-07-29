/**
 * 智能列表管理器组件
 * 提供智能列表的创建、编辑和应用功能
 */

import React, { useState, useEffect } from 'react';
import { smartListService, type SmartList } from '../../utils/smart-lists';
import type { FilterCriteria } from '../../types/interfaces';

interface SmartListManagerProps {
  currentFilters: FilterCriteria | null;
  onApplyFilters: (filters: FilterCriteria) => void;
  className?: string;
}

export const SmartListManager: React.FC<SmartListManagerProps> = ({
  currentFilters,
  onApplyFilters,
  className = '',
}) => {
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  // 预定义颜色选项
  const colorOptions = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#6B7280', // gray
    '#14B8A6', // teal
  ];

  // 加载智能列表
  useEffect(() => {
    setSmartLists(smartListService.getSmartLists());
  }, []);

  // 应用智能列表
  const handleApplySmartList = (smartList: SmartList) => {
    onApplyFilters(smartList.filters);
  };

  // 创建智能列表
  const handleCreateSmartList = () => {
    if (!newListName.trim() || !currentFilters) return;

    smartListService.createSmartList({
      name: newListName.trim(),
      description: newListDescription.trim() || undefined,
      filters: { ...currentFilters },
      color: selectedColor,
    });

    setSmartLists(smartListService.getSmartLists());
    setNewListName('');
    setNewListDescription('');
    setSelectedColor('#3B82F6');
    setShowCreateForm(false);
  };

  // 删除智能列表
  const handleDeleteSmartList = (id: string) => {
    if (smartListService.deleteSmartList(id)) {
      setSmartLists(smartListService.getSmartLists());
    }
  };

  // 复制智能列表
  const handleDuplicateSmartList = (id: string) => {
    const duplicated = smartListService.duplicateSmartList(id);
    if (duplicated) {
      setSmartLists(smartListService.getSmartLists());
    }
  };

  // 检查是否有活跃的过滤器
  const hasActiveFilters =
    currentFilters &&
    ((currentFilters.contexts && currentFilters.contexts.length > 0) ||
      (currentFilters.priorities && currentFilters.priorities.length > 0) ||
      (currentFilters.statuses && currentFilters.statuses.length > 0) ||
      currentFilters.dateRange ||
      (currentFilters.tags && currentFilters.tags.length > 0) ||
      currentFilters.searchText);

  // 获取过滤器描述
  const getFilterDescription = (filters: FilterCriteria): string => {
    const parts: string[] = [];

    if (filters.contexts && filters.contexts.length > 0) {
      parts.push(`${filters.contexts.length}个情境`);
    }

    if (filters.priorities && filters.priorities.length > 0) {
      parts.push(`${filters.priorities.length}个优先级`);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      parts.push(`${filters.statuses.length}个状态`);
    }

    if (filters.dateRange) {
      parts.push('日期范围');
    }

    if (filters.tags && filters.tags.length > 0) {
      parts.push(`${filters.tags.length}个标签`);
    }

    return parts.length > 0 ? parts.join(', ') : '无过滤条件';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">智能列表</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!hasActiveFilters}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
        >
          + 新建列表
        </button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                列表名称
              </label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="输入列表名称"
                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述 (可选)
              </label>
              <input
                type="text"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="输入列表描述"
                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                颜色
              </label>
              <div className="flex space-x-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedColor === color
                        ? 'border-gray-400'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              当前过滤条件:{' '}
              {currentFilters ? getFilterDescription(currentFilters) : '无'}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleCreateSmartList}
                disabled={!newListName.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-md transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewListName('');
                  setNewListDescription('');
                  setSelectedColor('#3B82F6');
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 智能列表内容 */}
      <div className="p-4 space-y-4">
        {/* 系统智能列表 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">系统列表</h4>
          <div className="space-y-2">
            {smartLists
              .filter((list) => list.isSystem)
              .map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleApplySmartList(list)}
                  className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: list.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {list.name}
                      </div>
                      {list.description && (
                        <div className="text-xs text-gray-500">
                          {list.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
          </div>
        </div>

        {/* 用户自定义智能列表 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">我的列表</h4>
          <div className="space-y-2">
            {smartLists.filter((list) => !list.isSystem).length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                暂无自定义列表
                <br />
                {hasActiveFilters
                  ? '点击上方"新建列表"创建'
                  : '设置过滤条件后可创建智能列表'}
              </div>
            ) : (
              smartLists
                .filter((list) => !list.isSystem)
                .map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                  >
                    <button
                      onClick={() => handleApplySmartList(list)}
                      className="flex-1 flex items-center space-x-3 text-left"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {list.name}
                        </div>
                        {list.description && (
                          <div className="text-xs text-gray-500">
                            {list.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {getFilterDescription(list.filters)}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicateSmartList(list.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="复制列表"
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSmartList(list.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除列表"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
