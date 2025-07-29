/**
 * 工作篮列表组件
 * 显示工作篮中的所有项目，支持批量操作和过滤
 */

import { useState, useEffect, useMemo } from 'react';
import type { InboxItem } from '../../types';
import { InputType } from '../../types';
import { useGTDStore } from '../../store/gtd-store';

interface InboxListProps {
  onItemSelect?: (item: InboxItem) => void;
  onItemProcess?: (item: InboxItem) => void;
  className?: string;
}

export const InboxList: React.FC<InboxListProps> = ({
  onItemSelect,
  onItemProcess,
  className = '',
}) => {
  const {
    inboxItems,
    getInboxItems,
    markAsProcessed,
    deleteInboxItem,
    captureError,
    clearCaptureError,
  } = useGTDStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed'>(
    'all'
  );
  const [typeFilter, setTypeFilter] = useState<InputType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // 加载工作篮数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await getInboxItems();
      } catch (error) {
        console.error('加载工作篮失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getInboxItems]);

  // 过滤后的项目列表
  const filteredItems = useMemo(() => {
    return inboxItems.filter((item: InboxItem) => {
      // 处理状态过滤
      if (filter === 'unprocessed' && item.processed) return false;
      if (filter === 'processed' && !item.processed) return false;

      // 类型过滤
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      return true;
    });
  }, [inboxItems, filter, typeFilter]);

  // 统计信息
  const stats = useMemo(() => {
    const total = inboxItems.length;
    const unprocessed = inboxItems.filter(
      (item: InboxItem) => !item.processed
    ).length;
    const processed = inboxItems.filter(
      (item: InboxItem) => item.processed
    ).length;

    return { total, unprocessed, processed };
  }, [inboxItems]);

  // 处理项目选择
  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(
        new Set(filteredItems.map((item: InboxItem) => item.id))
      );
    } else {
      setSelectedItems(new Set());
    }
  };

  // 批量标记为已处理
  const handleBatchMarkProcessed = async () => {
    if (selectedItems.size === 0) return;

    setIsLoading(true);
    try {
      await Promise.all(
        Array.from(selectedItems).map((id) => markAsProcessed(id))
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error('批量处理失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!window.confirm(`确定要删除选中的 ${selectedItems.size} 个项目吗？`)) {
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        Array.from(selectedItems).map((id) => deleteInboxItem(id))
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error('批量删除失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 单个项目操作
  const handleItemAction = async (
    item: InboxItem,
    action: 'process' | 'delete'
  ) => {
    setIsLoading(true);
    try {
      if (action === 'process') {
        if (item.processed) {
          // 如果已处理，触发处理回调
          onItemProcess?.(item);
        } else {
          await markAsProcessed(item.id);
        }
      } else if (action === 'delete') {
        if (window.confirm('确定要删除这个项目吗？')) {
          await deleteInboxItem(item.id);
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: InputType) => {
    switch (type) {
      case InputType.TEXT:
        return '📝';
      case InputType.VOICE:
        return '🎤';
      case InputType.IMAGE:
        return '🖼️';
      default:
        return '📄';
    }
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 初始加载状态
  const isInitialLoading = isLoading && inboxItems.length === 0;

  if (isInitialLoading) {
    return (
      <div className={`inbox-list ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inbox-list ${className}`}>
      {/* 头部统计和过滤 */}
      <div className="modern-header p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <div className="icon-container green">
                <span className="text-white text-lg">📥</span>
              </div>
              <h2 className="text-xl section-title">
                工作篮
              </h2>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="status-badge primary">总计: {stats.total}</span>
              <span className="status-badge warning">
                未处理: {stats.unprocessed}
              </span>
              <span className="status-badge success">
                已处理: {stats.processed}
              </span>
            </div>
          </div>

          {/* 批量操作按钮 */}
          {selectedItems.size > 0 && (
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                已选择 {selectedItems.size} 项
              </span>
              <button
                onClick={handleBatchMarkProcessed}
                disabled={isLoading}
                className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
              >
                标记已处理
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={isLoading}
                className="btn-ghost text-xs px-3 py-1 disabled:opacity-50 !border-red-300 !text-red-600 hover:!bg-red-50"
              >
                删除
              </button>
            </div>
          )}
        </div>

        {/* 过滤器 */}
        <div className="flex items-center space-x-6 flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              状态:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unprocessed' | 'processed')}
              className="modern-select text-sm"
            >
              <option value="all">全部</option>
              <option value="unprocessed">未处理</option>
              <option value="processed">已处理</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              类型:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InputType | 'all')}
              className="modern-select text-sm"
            >
              <option value="all">全部</option>
              <option value={InputType.TEXT}>文本</option>
              <option value={InputType.VOICE}>语音</option>
              <option value={InputType.IMAGE}>图片</option>
            </select>
          </div>

          {/* 全选复选框 */}
          {filteredItems.length > 0 && (
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
              <input
                type="checkbox"
                id="select-all"
                checked={
                  selectedItems.size === filteredItems.length &&
                  filteredItems.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                全选
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {captureError && (
        <div className="mx-4 my-3 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-500 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                {captureError}
              </p>
            </div>
            <button
              onClick={clearCaptureError}
              className="ml-4 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
              title="关闭错误提示"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 项目列表 */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredItems.length === 0 ? (
          <div className="empty-state m-6">
            {inboxItems.length === 0 ? (
              <div className="text-center">
                <div className="icon-container green mx-auto mb-6 w-20 h-20 flex items-center justify-center">
                  <span className="text-white text-3xl">📥</span>
                </div>
                <h3 className="text-xl section-title mb-3">
                  工作篮是空的
                </h3>
                <p className="section-subtitle text-base mb-6">
                  开始收集你的想法和任务吧！
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>快速输入想法</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>组织任务</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>高效执行</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="icon-container orange mx-auto mb-6 w-16 h-16 flex items-center justify-center">
                  <span className="text-white text-2xl">🔍</span>
                </div>
                <h3 className="text-lg section-title mb-2">
                  没有符合条件的项目
                </h3>
                <p className="section-subtitle">
                  尝试调整筛选条件查看更多内容
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredItems.map((item: InboxItem) => (
            <div
              key={item.id}
              className={`list-item mx-4 my-3 ${
                selectedItems.has(item.id) ? 'selected' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* 选择复选框 */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />

                {/* 类型图标 */}
                <div className="flex-shrink-0 text-2xl">
                  {getTypeIcon(item.type)}
                </div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className={`text-base cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-relaxed ${
                          item.processed
                            ? 'text-gray-500 dark:text-gray-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}
                        onClick={() => onItemSelect?.(item)}
                      >
                        {item.content}
                      </p>
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">
                          {formatDate(item.createdAt)}
                        </span>
                        {item.processed && (
                          <span className="status-badge success !text-xs !py-1 !px-2">
                            已处理
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!item.processed ? (
                        <button
                          onClick={() => handleItemAction(item, 'process')}
                          disabled={isLoading}
                          className="btn-primary text-xs px-4 py-2 disabled:opacity-50 rounded-lg"
                          title="标记为已处理"
                        >
                          {isLoading ? (
                            <div className="loading-spinner w-3 h-3"></div>
                          ) : (
                            '✅ 处理'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onItemProcess?.(item)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="查看处理结果"
                        >
                          👁️ 查看
                        </button>
                      )}
                      <button
                        onClick={() => handleItemAction(item, 'delete')}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs px-4 py-2 rounded-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                        title="删除"
                      >
                        {isLoading ? (
                          <div className="loading-spinner w-3 h-3"></div>
                        ) : (
                          '🗑️ 删除'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 加载指示器 */}
      {isLoading && inboxItems.length > 0 && (
        <div className="p-6 text-center">
          <div className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="loading-spinner mr-3"></div>
            处理中...
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxList;
