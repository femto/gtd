/**
 * 情境列表组件
 * 显示和管理所有情境
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { Context } from '../../types/interfaces';

interface ContextListProps {
  onSelectContext?: (context: Context) => void;
  onEditContext?: (context: Context) => void;
  selectedContextId?: string;
  showActions?: boolean;
}

export const ContextList: React.FC<ContextListProps> = ({
  onSelectContext,
  onEditContext,
  selectedContextId,
  showActions = true,
}) => {
  const {
    contexts,
    selectedContext,
    setSelectedContext,
    deleteContext,
    updateContext,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [localContexts, setLocalContexts] = useState<Context[]>([]);

  useEffect(() => {
    setLocalContexts(contexts);
  }, [contexts]);

  const handleSelectContext = (context: Context) => {
    setSelectedContext(context.id);
    onSelectContext?.(context);
  };

  const handleToggleActive = async (context: Context) => {
    try {
      await updateContext(context.id, { isActive: !context.isActive });
    } catch (error) {
      console.error('切换情境状态失败:', error);
    }
  };

  const handleDeleteContext = async (context: Context) => {
    if (window.confirm(`确定要删除情境"${context.name}"吗？`)) {
      try {
        await deleteContext(context.id);
      } catch (error) {
        console.error('删除情境失败:', error);
      }
    }
  };

  const activeContexts = localContexts.filter((c) => c.isActive);
  const inactiveContexts = localContexts.filter((c) => !c.isActive);

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

      {/* 活跃情境 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">活跃情境</h3>
        {activeContexts.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无活跃情境</p>
        ) : (
          <div className="space-y-2">
            {activeContexts.map((context) => (
              <ContextItem
                key={context.id}
                context={context}
                isSelected={
                  selectedContextId === context.id ||
                  selectedContext === context.id
                }
                onSelect={() => handleSelectContext(context)}
                onEdit={onEditContext}
                onToggleActive={() => handleToggleActive(context)}
                onDelete={() => handleDeleteContext(context)}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </div>

      {/* 非活跃情境 */}
      {inactiveContexts.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-500 mb-3">非活跃情境</h3>
          <div className="space-y-2">
            {inactiveContexts.map((context) => (
              <ContextItem
                key={context.id}
                context={context}
                isSelected={
                  selectedContextId === context.id ||
                  selectedContext === context.id
                }
                onSelect={() => handleSelectContext(context)}
                onEdit={onEditContext}
                onToggleActive={() => handleToggleActive(context)}
                onDelete={() => handleDeleteContext(context)}
                showActions={showActions}
                isInactive
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ContextItemProps {
  context: Context;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: (context: Context) => void;
  onToggleActive: () => void;
  onDelete: () => void;
  showActions: boolean;
  isInactive?: boolean;
}

const ContextItem: React.FC<ContextItemProps> = ({
  context,
  isSelected,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
  showActions,
  isInactive = false,
}) => {
  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
        ${
          isSelected
            ? 'border-blue-300 bg-blue-50'
            : isInactive
              ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              : 'border-gray-200 bg-white hover:bg-gray-50'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: context.color }}
        />
        <div className="flex items-center space-x-2">
          {context.icon && <span className="text-lg">{context.icon}</span>}
          <div>
            <h4
              className={`font-medium ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
            >
              {context.name}
            </h4>
            {context.description && (
              <p
                className={`text-sm ${isInactive ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {context.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {showActions && (
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onToggleActive}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${
                context.isActive
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            title={context.isActive ? '停用' : '激活'}
          >
            {context.isActive ? '✓' : '○'}
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(context)}
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
