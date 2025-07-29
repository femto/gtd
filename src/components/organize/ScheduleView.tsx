/**
 * 日程安排视图组件
 * 显示按时间安排的任务和日程项目
 */

import React, { useState } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { CalendarItem, Action } from '../../types/interfaces';
import { ActionStatus } from '../../types/enums';

interface ScheduleViewProps {
  onSelectItem?: (item: CalendarItem | Action) => void;
  onEditItem?: (item: CalendarItem | Action) => void;
  selectedItemId?: string;
  showActions?: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onSelectItem,
  onEditItem: _onEditItem,
  selectedItemId: _selectedItemId,
  showActions = true,
}) => {
  const {
    calendarItems,
    actions,
    updateAction,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // 获取当前周的日期范围
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day; // 调整到周日
    start.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      dates.push(currentDate);
    }
    return dates;
  };

  // 获取指定日期的项目
  const getItemsForDate = (date: Date) => {
    const dateStr = date.toDateString();

    // 获取日程项目
    const calendarItemsForDate = calendarItems.filter((item) => {
      const itemDate = new Date(item.startTime);
      return itemDate.toDateString() === dateStr;
    });

    // 获取有截止日期的行动
    const actionsForDate = actions.filter((action) => {
      if (!action.dueDate || action.status === ActionStatus.COMPLETED)
        return false;
      const actionDate = new Date(action.dueDate);
      return actionDate.toDateString() === dateStr;
    });

    // 获取已安排的行动
    const scheduledActions = actions.filter((action) => {
      if (action.status !== ActionStatus.SCHEDULED || !action.dueDate)
        return false;
      const actionDate = new Date(action.dueDate);
      return actionDate.toDateString() === dateStr;
    });

    return {
      calendar: calendarItemsForDate,
      due: actionsForDate,
      scheduled: scheduledActions,
    };
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
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

  const weekDates = getWeekDates(currentWeek);
  const today = new Date();
  const todayStr = today.toDateString();

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

      {/* 导航控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousWeek}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            ← 上周
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            今天
          </button>
          <button
            onClick={handleNextWeek}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            下周 →
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {weekDates[0].toLocaleDateString()} -{' '}
            {weekDates[6].toLocaleDateString()}
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'week' | 'day')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">周视图</option>
            <option value="day">日视图</option>
          </select>
        </div>
      </div>

      {/* 周视图 */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const items = getItemsForDate(date);
            const isToday = date.toDateString() === todayStr;
            const dayNames = [
              '周日',
              '周一',
              '周二',
              '周三',
              '周四',
              '周五',
              '周六',
            ];

            return (
              <div
                key={date.toISOString()}
                className={`
                  min-h-32 p-3 rounded-lg border
                  ${
                    isToday
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }
                `}
              >
                <div className="text-center mb-2">
                  <div
                    className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}
                  >
                    {dayNames[index]}
                  </div>
                  <div
                    className={`text-lg font-bold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}
                  >
                    {date.getDate()}
                  </div>
                </div>

                <div className="space-y-1">
                  {/* 日程项目 */}
                  {items.calendar.map((item) => (
                    <div
                      key={`calendar-${item.id}`}
                      className="p-1 text-xs bg-purple-100 text-purple-800 rounded cursor-pointer hover:bg-purple-200"
                      onClick={() => onSelectItem?.(item)}
                    >
                      <div className="font-medium truncate">{item.title}</div>
                      {!item.isAllDay && (
                        <div className="text-purple-600">
                          {new Date(item.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 已安排的行动 */}
                  {items.scheduled.map((action) => (
                    <div
                      key={`scheduled-${action.id}`}
                      className="p-1 text-xs bg-green-100 text-green-800 rounded cursor-pointer hover:bg-green-200"
                      onClick={() => onSelectItem?.(action)}
                    >
                      <div className="font-medium truncate">{action.title}</div>
                      <div className="text-green-600">已安排</div>
                    </div>
                  ))}

                  {/* 到期的行动 */}
                  {items.due.map((action) => (
                    <div
                      key={`due-${action.id}`}
                      className="p-1 text-xs bg-red-100 text-red-800 rounded cursor-pointer hover:bg-red-200"
                      onClick={() => onSelectItem?.(action)}
                    >
                      <div className="font-medium truncate">{action.title}</div>
                      <div className="text-red-600">截止</div>
                      {showActions && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteAction(action);
                          }}
                          className="mt-1 px-1 py-0.5 text-xs bg-red-200 text-red-800 rounded hover:bg-red-300"
                        >
                          完成
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 日视图 */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentWeek.toLocaleDateString()} - 详细视图
          </h3>

          {(() => {
            const items = getItemsForDate(currentWeek);
            const allItems = [
              ...items.calendar.map((item) => ({
                ...item,
                type: 'calendar' as const,
              })),
              ...items.scheduled.map((item) => ({
                ...item,
                type: 'scheduled' as const,
              })),
              ...items.due.map((item) => ({ ...item, type: 'due' as const })),
            ];

            if (allItems.length === 0) {
              return (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📅</div>
                  <p className="text-gray-600">这一天没有安排</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {allItems.map((item, index) => (
                  <div
                    key={`${item.type}-${item.id}-${index}`}
                    className={`
                      p-4 rounded-lg border cursor-pointer transition-colors
                      ${
                        item.type === 'calendar'
                          ? 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                          : item.type === 'scheduled'
                            ? 'border-green-200 bg-green-50 hover:bg-green-100'
                            : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }
                    `}
                    onClick={() => onSelectItem?.(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span
                            className={`
                            px-2 py-1 rounded text-xs
                            ${
                              item.type === 'calendar'
                                ? 'bg-purple-100 text-purple-700'
                                : item.type === 'scheduled'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                            }
                          `}
                          >
                            {item.type === 'calendar'
                              ? '日程'
                              : item.type === 'scheduled'
                                ? '已安排'
                                : '截止'}
                          </span>
                          {'startTime' in item && (
                            <span>
                              {new Date(item.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          {'dueDate' in item && item.dueDate && (
                            <span>
                              截止:{' '}
                              {new Date(item.dueDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {showActions && item.type === 'due' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteAction(item as Action);
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                        >
                          完成
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* 统计信息 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">本周统计</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-purple-600">
              {weekDates.reduce(
                (sum, date) => sum + getItemsForDate(date).calendar.length,
                0
              )}
            </div>
            <div className="text-xs text-gray-600">日程项目</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {weekDates.reduce(
                (sum, date) => sum + getItemsForDate(date).scheduled.length,
                0
              )}
            </div>
            <div className="text-xs text-gray-600">已安排任务</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {weekDates.reduce(
                (sum, date) => sum + getItemsForDate(date).due.length,
                0
              )}
            </div>
            <div className="text-xs text-gray-600">到期任务</div>
          </div>
        </div>
      </div>
    </div>
  );
};
