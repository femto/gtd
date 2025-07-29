/**
 * 按情境分类的行动列表组件
 * 显示按情境组织的待办事项
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { Action } from '../../types/interfaces';
import { ActionStatus, Priority } from '../../types/enums';

interface ContextualActionListProps {
  onSelectAction?: (action: Action) => void;
  onEditAction?: (action: Action) => void;
  selectedActionId?: string;
  showActions?: boolean;
  filterStatus?: ActionStatus[];
}

export const ContextualActionList: React.FC<ContextualActionListProps> = ({
  onSelectAction,
  onEditAction,
  selectedActionId,
  showActions = true,
  filterStatus = [ActionStatus.NEXT],
}) => {
  const {
    actions,
    contexts,
    updateAction,
    deleteAction,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'title'>(
    'priority'
  );
  const [showEmptyContexts, setShowEmptyContexts] = useState(false);

  // 按情境分组行动
  const getActionsByContext = () => {
    const filteredActions = actions.filter((action) =>
      filterStatus.includes(action.status)
    );

    const contextGroups = new Map<string, Action[]>();
    const orphanActions: Action[] = [];

    // 初始化所有情境
    contexts.forEach((context) => {
      if (context.isActive) {
        contextGroups.set(context.id, []);
      }
    });

    // 分组行动
    filteredActions.forEach((action) => {
      if (action.contextId && contextGroups.has(action.contextId)) {
        contextGroups.get(action.contextId)!.push(action);
      } else {
        orphanActions.push(action);
      }
    });

    // 排序每个组内的行动
    contextGroups.forEach((actions, contextId) => {
      contextGroups.set(contextId, sortActions(actions));
    });

    return { contextGroups, orphanActions: sortActions(orphanActions) };
  };

  const sortActions = (actions: Action[]) => {
    return [...actions].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (
            (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
          );
        case 'date':
          if (!a.dueDate && !b.dueDate)
            return b.createdAt.getTime() - a.createdAt.getTime();
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  const handleToggleContext = (contextId: string) => {
    const newExpanded = new Set(expandedContexts);
    if (newExpanded.has(contextId)) {
      newExpanded.delete(contextId);
    } else {
      newExpanded.add(contextId);
    }
    setExpandedContexts(newExpanded);
  };

  const handleCompleteAction = async (action: Action) => {
    try {
      await updateAction(action.id, {
        status: ActionStatus.COMPLETED,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  const handleDeleteAction = async (action: Action) => {
    if (window.confirm(`确定要删除行动"${action.title}"吗？`)) {
      try {
        await deleteAction(action.id);
      } catch (error) {
        console.error('删除行动失败:', error);
      }
    }
  };

  const getPriorityColor = (priority: Priority) => {
    const colors = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100',
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityLabel = (priority: Priority) => {
    const labels = {
      urgent: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[priority] || '中';
  };

  const { contextGroups, orphanActions } = getActionsByContext();
  const totalActions =
    Array.from(contextGroups.values()).reduce(
      (sum, actions) => sum + actions.length,
      0
    ) + orphanActions.length;

  // 默认展开有任务的情境
  useEffect(() => {
    const contextsWithActions = new Set<string>();
    contextGroups.forEach((actions, contextId) => {
      if (actions.length > 0) {
        contextsWithActions.add(contextId);
      }
    });
    setExpandedContexts(contextsWithActions);
  }, [actions, contexts]);

  return (
    <div className="space-y-4">
      {organizeError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{organizeError}</p>
              <button
                onClick={clearOrganizeError}
                className="mt-1 text-xs text-red-600 hover:text-red-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 控制面板 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">排序:</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'priority' | 'date' | 'title')
            }
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">优先级</option>
            <option value="date">截止时间</option>
            <option value="title">标题</option>
          </select>

          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showEmptyContexts}
              onChange={(e) => setShowEmptyContexts(e.target.checked)}
              className="mr-2"
            />
            显示空情境
          </label>
        </div>

        <span className="text-sm text-gray-500">
          共 {totalActions} 个待办事项
        </span>
      </div>

      {/* 按情境分组的行动列表 */}
      <div className="space-y-3">
        {Array.from(contextGroups.entries()).map(
          ([contextId, contextActions]) => {
            const context = contexts.find((c) => c.id === contextId);
            if (
              !context ||
              (!showEmptyContexts && contextActions.length === 0)
            ) {
              return null;
            }

            const isExpanded = expandedContexts.has(contextId);

            return (
              <div
                key={contextId}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* 情境标题 */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggleContext(contextId)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: context.color }}
                    />
                    {context.icon && (
                      <span className="text-lg">{context.icon}</span>
                    )}
                    <h3 className="font-medium text-gray-900">
                      {context.name}
                    </h3>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {contextActions.length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {contextActions.length > 0 && (
                      <div className="flex space-x-1">
                        {contextActions.slice(0, 3).map((action) => (
                          <div
                            key={action.id}
                            className={`w-2 h-2 rounded-full ${getPriorityColor(action.priority).split(' ')[1]}`}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* 行动列表 */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {contextActions.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        此情境下暂无待办事项
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {contextActions.map((action) => (
                          <ActionItem
                            key={action.id}
                            action={action}
                            isSelected={selectedActionId === action.id}
                            onSelect={() => onSelectAction?.(action)}
                            onEdit={onEditAction}
                            onComplete={() => handleCompleteAction(action)}
                            onDelete={() => handleDeleteAction(action)}
                            showActions={showActions}
                            getPriorityColor={getPriorityColor}
                            getPriorityLabel={getPriorityLabel}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
        )}

        {/* 未分类行动 */}
        {orphanActions.length > 0 && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-yellow-400" />
                <h3 className="font-medium text-yellow-800">未分类行动</h3>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {orphanActions.length}
                </span>
              </div>
            </div>
            <div className="border-t border-yellow-200 divide-y divide-yellow-100">
              {orphanActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  isSelected={selectedActionId === action.id}
                  onSelect={() => onSelectAction?.(action)}
                  onEdit={onEditAction}
                  onComplete={() => handleCompleteAction(action)}
                  onDelete={() => handleDeleteAction(action)}
                  showActions={showActions}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {totalActions === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            暂无待办事项
          </h3>
          <p className="text-gray-600">所有任务都已完成，或者还没有创建任务</p>
        </div>
      )}
    </div>
  );
};

interface ActionItemProps {
  action: Action;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: (action: Action) => void;
  onComplete: () => void;
  onDelete: () => void;
  showActions: boolean;
  getPriorityColor: (priority: Priority) => string;
  getPriorityLabel: (priority: Priority) => string;
}

const ActionItem: React.FC<ActionItemProps> = ({
  action,
  isSelected,
  onSelect,
  onEdit,
  onComplete,
  onDelete,
  showActions,
  getPriorityColor,
  getPriorityLabel,
}) => {
  const isOverdue = action.dueDate && action.dueDate < new Date();

  return (
    <div
      className={`
        flex items-center justify-between p-4 cursor-pointer transition-colors
        ${
          isSelected
            ? 'bg-blue-50'
            : isOverdue
              ? 'bg-red-50 hover:bg-red-100'
              : 'hover:bg-gray-50'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3 mb-2">
          <h4 className="font-medium text-gray-900 truncate">{action.title}</h4>
          <span
            className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(action.priority)}`}
          >
            {getPriorityLabel(action.priority)}
          </span>
          {isOverdue && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              已过期
            </span>
          )}
        </div>

        {action.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {action.description}
          </p>
        )}

        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {action.estimatedTime && (
            <span>预计: {action.estimatedTime}分钟</span>
          )}
          {action.dueDate && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              截止: {action.dueDate.toLocaleDateString()}
            </span>
          )}
          <span>创建: {action.createdAt.toLocaleDateString()}</span>
        </div>
      </div>

      {showActions && (
        <div
          className="flex items-center space-x-2 ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onComplete}
            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            title="完成"
          >
            ✓
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(action)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              title="编辑"
            >
              ✏️
            </button>
          )}

          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            title="删除"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};
