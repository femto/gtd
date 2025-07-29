/**
 * 等待列表组件
 * 显示和管理等待他人的项目
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { WaitingItem } from '../../types/interfaces';

interface WaitingListProps {
  onSelectItem?: (item: WaitingItem) => void;
  onEditItem?: (item: WaitingItem) => void;
  selectedItemId?: string;
  showActions?: boolean;
}

export const WaitingList: React.FC<WaitingListProps> = ({
  onSelectItem,
  onEditItem,
  selectedItemId,
  showActions = true,
}) => {
  const {
    waitingItems,
    updateWaitingItem,
    deleteWaitingItem,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [localItems, setLocalItems] = useState<WaitingItem[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'followUp' | 'title'>('date');

  useEffect(() => {
    const sorted = [...waitingItems];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'followUp':
        sorted.sort((a, b) => {
          if (!a.followUpDate && !b.followUpDate) return 0;
          if (!a.followUpDate) return 1;
          if (!b.followUpDate) return -1;
          return a.followUpDate.getTime() - b.followUpDate.getTime();
        });
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setLocalItems(sorted);
  }, [waitingItems, sortBy]);

  const handleSelectItem = (item: WaitingItem) => {
    onSelectItem?.(item);
  };

  const handleMarkAsFollowedUp = async (item: WaitingItem) => {
    try {
      await updateWaitingItem(item.id, {
        followUpDate: new Date(),
        notes:
          (item.notes || '') + `\n跟进时间: ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      console.error('标记跟进失败:', error);
    }
  };

  const handleDeleteItem = async (item: WaitingItem) => {
    if (window.confirm(`确定要删除等待项目"${item.title}"吗？`)) {
      try {
        await deleteWaitingItem(item.id);
      } catch (error) {
        console.error('删除等待项目失败:', error);
      }
    }
  };

  const getOverdueItems = () => {
    const now = new Date();
    return localItems.filter(
      (item) => item.followUpDate && item.followUpDate < now
    );
  };

  const getUpcomingItems = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return localItems.filter(
      (item) =>
        item.followUpDate &&
        item.followUpDate >= now &&
        item.followUpDate <= nextWeek
    );
  };

  const overdueItems = getOverdueItems();
  const upcomingItems = getUpcomingItems();

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

      {/* 排序控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">排序方式:</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'date' | 'followUp' | 'title')
            }
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">创建时间</option>
            <option value="followUp">跟进时间</option>
            <option value="title">标题</option>
          </select>
        </div>
        <span className="text-sm text-gray-500">
          共 {localItems.length} 个等待项目
        </span>
      </div>

      {/* 过期提醒 */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            ⚠️ 需要跟进 ({overdueItems.length} 项)
          </h3>
          <div className="space-y-2">
            {overdueItems.slice(0, 3).map((item) => (
              <div key={item.id} className="text-sm text-red-700">
                <span className="font-medium">{item.title}</span>
                <span className="text-red-600 ml-2">
                  (应于 {item.followUpDate?.toLocaleDateString()} 跟进)
                </span>
              </div>
            ))}
            {overdueItems.length > 3 && (
              <div className="text-sm text-red-600">
                还有 {overdueItems.length - 3} 个项目需要跟进...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 即将到期提醒 */}
      {upcomingItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            📅 本周需跟进 ({upcomingItems.length} 项)
          </h3>
          <div className="space-y-1">
            {upcomingItems.slice(0, 3).map((item) => (
              <div key={item.id} className="text-sm text-yellow-700">
                <span className="font-medium">{item.title}</span>
                <span className="text-yellow-600 ml-2">
                  ({item.followUpDate?.toLocaleDateString()})
                </span>
              </div>
            ))}
            {upcomingItems.length > 3 && (
              <div className="text-sm text-yellow-600">
                还有 {upcomingItems.length - 3} 个项目本周需跟进...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 等待项目列表 */}
      {localItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            暂无等待项目
          </h3>
          <p className="text-gray-600">
            当您委派任务给他人时，这里会显示等待跟进的项目
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localItems.map((item) => (
            <WaitingItemCard
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => handleSelectItem(item)}
              onEdit={onEditItem}
              onMarkFollowedUp={() => handleMarkAsFollowedUp(item)}
              onDelete={() => handleDeleteItem(item)}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface WaitingItemCardProps {
  item: WaitingItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: (item: WaitingItem) => void;
  onMarkFollowedUp: () => void;
  onDelete: () => void;
  showActions: boolean;
}

const WaitingItemCard: React.FC<WaitingItemCardProps> = ({
  item,
  isSelected,
  onSelect,
  onEdit,
  onMarkFollowedUp,
  onDelete,
  showActions,
}) => {
  const isOverdue = item.followUpDate && item.followUpDate < new Date();
  const isUpcoming =
    item.followUpDate &&
    item.followUpDate >= new Date() &&
    item.followUpDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors
        ${
          isSelected
            ? 'border-blue-300 bg-blue-50'
            : isOverdue
              ? 'border-red-200 bg-red-50 hover:bg-red-100'
              : isUpcoming
                ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                : 'border-gray-200 bg-white hover:bg-gray-50'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3 mb-2">
          <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
          {isOverdue && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              需跟进
            </span>
          )}
          {isUpcoming && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              本周跟进
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
          <span>等待: {item.waitingFor}</span>
          {item.followUpDate && (
            <span>跟进时间: {item.followUpDate.toLocaleDateString()}</span>
          )}
        </div>

        {item.notes && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1">
            备注: {item.notes}
          </p>
        )}

        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>创建: {item.createdAt.toLocaleDateString()}</span>
          <span>更新: {item.updatedAt.toLocaleDateString()}</span>
        </div>
      </div>

      {showActions && (
        <div
          className="flex items-center space-x-2 ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onMarkFollowedUp}
            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            title="标记已跟进"
          >
            ✓ 跟进
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(item)}
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
