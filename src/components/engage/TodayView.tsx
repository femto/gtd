/**
 * 今日任务视图组件
 * 显示今天需要完成的任务
 */

import React, { useEffect, useState } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import { ActionCard } from './ActionCard';
import { ActionFilters } from './ActionFilters';
import { SearchBar } from './SearchBar';
import type { Action, FilterCriteria } from '../../types/interfaces';
import { ActionStatus } from '../../types/enums';

export const TodayView: React.FC = () => {
  const {
    actions,
    contexts,
    getTodayActions,
    completeAction,
    updateAction,
    engageError,
    clearEngageError,
    isLoading,
  } = useGTDStore();

  const [filteredActions, setFilteredActions] = useState<Action[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 加载今日任务
  useEffect(() => {
    const loadTodayActions = async () => {
      try {
        await getTodayActions();
      } catch (error) {
        console.error('加载今日任务失败:', error);
      }
    };

    loadTodayActions();
  }, [getTodayActions]);

  // 应用过滤和搜索
  useEffect(() => {
    let filtered = actions.filter((action) => {
      // 只显示下一步行动和今日到期的任务
      if (action.status !== ActionStatus.NEXT) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 包含今日到期或无截止日期的下一步行动
      const isDueToday = !action.dueDate || action.dueDate < tomorrow;
      if (!isDueToday) return false;

      return true;
    });

    // 应用搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (action) =>
          action.title.toLowerCase().includes(query) ||
          action.description?.toLowerCase().includes(query) ||
          action.notes?.toLowerCase().includes(query)
      );
    }

    // 应用过滤条件
    if (filterCriteria.contexts && filterCriteria.contexts.length > 0) {
      filtered = filtered.filter((action) =>
        filterCriteria.contexts!.includes(action.contextId)
      );
    }

    if (filterCriteria.priorities && filterCriteria.priorities.length > 0) {
      filtered = filtered.filter((action) =>
        filterCriteria.priorities!.includes(action.priority)
      );
    }

    if (filterCriteria.tags && filterCriteria.tags.length > 0) {
      filtered = filtered.filter(
        (action) =>
          action.tags &&
          filterCriteria.tags!.some((tag) => action.tags!.includes(tag))
      );
    }

    // 按优先级和截止日期排序
    filtered.sort((a, b) => {
      // 首先按优先级排序
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // 然后按截止日期排序
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // 最后按创建时间排序
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    setFilteredActions(filtered);
  }, [actions, searchQuery, filterCriteria]);

  const handleCompleteAction = async (actionId: string) => {
    try {
      await completeAction(actionId);
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  const handleUpdateAction = async (
    actionId: string,
    updates: Partial<Action>
  ) => {
    try {
      await updateAction(actionId, updates);
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (criteria: FilterCriteria) => {
    setFilterCriteria(criteria);
  };

  const handleClearFilters = () => {
    setFilterCriteria({});
    setSearchQuery('');
  };

  const getContextName = (contextId: string) => {
    const context = contexts.find((c) => c.id === contextId);
    return context?.name || '未知情境';
  };

  const getContextColor = (contextId: string) => {
    const context = contexts.find((c) => c.id === contextId);
    return context?.color || '#6B7280';
  };

  const completedToday = actions.filter(
    (action) =>
      action.status === ActionStatus.COMPLETED &&
      action.completedAt &&
      action.completedAt.toDateString() === new Date().toDateString()
  ).length;

  const overdueActions = filteredActions.filter((action) => {
    if (!action.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return action.dueDate < today;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载今日任务...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 页面标题和统计 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-4">
              <div className="icon-container green mr-4">
                <span className="text-white text-xl">✅</span>
              </div>
              <h1 className="text-2xl sm:text-3xl section-title">今日任务</h1>
            </div>
            <p className="section-subtitle text-base sm:text-lg leading-relaxed">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="status-badge success !text-base !px-4 !py-2">
                {completedToday}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">已完成</div>
            </div>
            <div className="text-center">
              <div className="status-badge primary !text-base !px-4 !py-2">
                {filteredActions.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">待处理</div>
            </div>
            {overdueActions.length > 0 && (
              <div className="text-center">
                <div className="status-badge error !text-base !px-4 !py-2">
                  {overdueActions.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">已过期</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-8 space-y-6">
        <div className="modern-card card-hover">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="搜索今日任务..."
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="btn-ghost flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>过滤器</span>
            {(filterCriteria.contexts?.length ||
              filterCriteria.priorities?.length ||
              filterCriteria.tags?.length) && (
              <span className="status-badge primary !text-xs !px-2 !py-1">
                {(filterCriteria.contexts?.length || 0) +
                  (filterCriteria.priorities?.length || 0) +
                  (filterCriteria.tags?.length || 0)}
              </span>
            )}
          </button>

          {(searchQuery || Object.keys(filterCriteria).length > 0) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
            >
              清除所有过滤器
            </button>
          )}
        </div>

        {isFilterOpen && (
          <div className="modern-card card-hover">
            <ActionFilters
              criteria={filterCriteria}
              onChange={handleFilterChange}
              contexts={contexts}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {engageError && (
        <div className="mb-8 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{engageError}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearEngageError}
                className="inline-flex text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="space-y-6">
        {filteredActions.length === 0 ? (
          <div className="empty-state">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchQuery || Object.keys(filterCriteria).length > 0
                ? '没有找到匹配的任务'
                : '今天没有待处理的任务'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || Object.keys(filterCriteria).length > 0
                ? '尝试调整搜索条件或过滤器'
                : '恭喜！你今天的任务都完成了'}
            </p>
          </div>
        ) : (
          <>
            {/* 过期任务 */}
            {overdueActions.length > 0 && (
              <div className="modern-card card-hover">
                <div className="flex items-center mb-6">
                  <div className="icon-container red mr-4">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                    过期任务 ({overdueActions.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {overdueActions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      contextName={getContextName(action.contextId)}
                      contextColor={getContextColor(action.contextId)}
                      onComplete={() => handleCompleteAction(action.id)}
                      onUpdate={(updates) =>
                        handleUpdateAction(action.id, updates)
                      }
                      isOverdue={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 今日任务 */}
            <div className="modern-card card-hover">
              <div className="flex items-center mb-6">
                <div className="icon-container blue mr-4">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  今日任务 (
                  {
                    filteredActions.filter((a) => !overdueActions.includes(a))
                      .length
                  }
                  )
                </h2>
              </div>
              <div className="space-y-4">
                {filteredActions
                  .filter((action) => !overdueActions.includes(action))
                  .map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      contextName={getContextName(action.contextId)}
                      contextColor={getContextColor(action.contextId)}
                      onComplete={() => handleCompleteAction(action.id)}
                      onUpdate={(updates) =>
                        handleUpdateAction(action.id, updates)
                      }
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
