/**
 * 增强的日历视图组件
 * 支持日、周、月视图切换和拖拽调整时间功能
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { CalendarItem, Action } from '../../types/interfaces';
import { ActionStatus } from '../../types/enums';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'calendar' | 'action';
  data: CalendarItem | Action;
  color: string;
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour?: number) => void;
  selectedEventId?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onEventClick,
  onEventEdit,
  onTimeSlotClick,
  selectedEventId,
}) => {
  const {
    calendarItems,
    actions,
    updateCalendarItem,
    updateAction,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // 将日程项目和行动转换为日历事件
  const events = useMemo((): CalendarEvent[] => {
    const calendarEvents: CalendarEvent[] = calendarItems.map((item) => ({
      id: `calendar-${item.id}`,
      title: item.title,
      start: new Date(item.startTime),
      end: item.endTime
        ? new Date(item.endTime)
        : new Date(item.startTime.getTime() + 60 * 60 * 1000),
      type: 'calendar' as const,
      data: item,
      color: 'bg-purple-500',
    }));

    const actionEvents: CalendarEvent[] = actions
      .filter(
        (action) =>
          (action.status === ActionStatus.SCHEDULED || action.dueDate) &&
          action.status !== ActionStatus.COMPLETED
      )
      .map((action) => ({
        id: `action-${action.id}`,
        title: action.title,
        start: action.dueDate ? new Date(action.dueDate) : new Date(),
        end: action.dueDate
          ? new Date(
              action.dueDate.getTime() +
                (action.estimatedTime || 60) * 60 * 1000
            )
          : new Date(),
        type: 'action' as const,
        data: action,
        color:
          action.status === ActionStatus.SCHEDULED
            ? 'bg-green-500'
            : 'bg-red-500',
      }));

    return [...calendarEvents, ...actionEvents];
  }, [calendarItems, actions]);

  // 获取当前视图的日期范围
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }, [currentDate, viewMode]);

  // 获取当前视图的事件
  const visibleEvents = useMemo(() => {
    const { start, end } = getDateRange();
    return events.filter((event) => event.start <= end && event.end >= start);
  }, [events, getDateRange]);

  // 导航函数
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // 拖拽处理
  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (
    targetDate: Date,
    targetHour?: number,
    e?: React.DragEvent
  ) => {
    e?.preventDefault();

    if (!draggedEvent) return;

    try {
      const newStart = new Date(targetDate);
      if (targetHour !== undefined) {
        newStart.setHours(targetHour, 0, 0, 0);
      }

      const duration =
        draggedEvent.end.getTime() - draggedEvent.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      if (draggedEvent.type === 'calendar') {
        await updateCalendarItem(draggedEvent.data.id, {
          startTime: newStart,
          endTime: newEnd,
        });
      } else {
        await updateAction(draggedEvent.data.id, {
          dueDate: newStart,
        });
      }
    } catch (error) {
      console.error('更新事件时间失败:', error);
    } finally {
      setDraggedEvent(null);
    }
  };

  // 格式化标题
  const formatTitle = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
      case 'week':
        const { start, end } = getDateRange();
        return `${start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return currentDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
        });
    }
  };

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

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={navigatePrevious}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            ← 上一个
          </button>
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            今天
          </button>
          <button
            onClick={navigateNext}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            下一个 →
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">{formatTitle()}</h2>

        <div className="flex items-center space-x-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">日视图</option>
            <option value="week">周视图</option>
            <option value="month">月视图</option>
          </select>
        </div>
      </div>

      {/* 日历内容 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {viewMode === 'day' && (
          <DayView
            date={currentDate}
            events={visibleEvents}
            onEventClick={onEventClick}
            onEventEdit={onEventEdit}
            onTimeSlotClick={onTimeSlotClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            selectedEventId={selectedEventId}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            startDate={getDateRange().start}
            events={visibleEvents}
            onEventClick={onEventClick}
            onEventEdit={onEventEdit}
            onTimeSlotClick={onTimeSlotClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            selectedEventId={selectedEventId}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            date={currentDate}
            events={visibleEvents}
            onEventClick={onEventClick}
            onEventEdit={onEventEdit}
            onTimeSlotClick={onTimeSlotClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            selectedEventId={selectedEventId}
          />
        )}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-gray-600">日程项目</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">已安排任务</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">到期任务</span>
        </div>
      </div>
    </div>
  );
};

// 日视图组件
interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour?: number) => void;
  onDragStart: (event: CalendarEvent, e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetDate: Date, targetHour?: number, e?: React.DragEvent) => void;
  selectedEventId?: string;
}

const DayView: React.FC<DayViewProps> = ({
  date,
  events,
  onEventClick,
  onEventEdit,
  onTimeSlotClick,
  onDragStart,
  onDragOver,
  onDrop,
  selectedEventId,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventHour = event.start.getHours();
      const eventEndHour = event.end.getHours();
      return eventHour <= hour && hour < eventEndHour;
    });
  };

  return (
    <div className="divide-y divide-gray-200">
      {hours.map((hour) => {
        const hourEvents = getEventsForHour(hour);

        return (
          <div
            key={hour}
            className="flex min-h-16 hover:bg-gray-50"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(date, hour, e)}
          >
            {/* 时间标签 */}
            <div className="w-16 flex-shrink-0 p-2 text-sm text-gray-500 text-right">
              {hour.toString().padStart(2, '0')}:00
            </div>

            {/* 事件区域 */}
            <div
              className="flex-1 p-2 cursor-pointer relative"
              onClick={() => onTimeSlotClick?.(date, hour)}
            >
              {hourEvents.map((event) => (
                <div
                  key={event.id}
                  draggable
                  onDragStart={(e) => onDragStart(event, e)}
                  className={`
                    absolute left-2 right-2 p-2 rounded text-white text-sm cursor-move
                    ${event.color} ${selectedEventId === event.id ? 'ring-2 ring-blue-400' : ''}
                    hover:opacity-90 transition-opacity
                  `}
                  style={{
                    top: `${(event.start.getMinutes() / 60) * 100}%`,
                    height: `${((event.end.getTime() - event.start.getTime()) / (60 * 60 * 1000)) * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEventEdit?.(event);
                  }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="text-xs opacity-90">
                    {event.start.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -
                    {event.end.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 周视图组件
interface WeekViewProps {
  startDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour?: number) => void;
  onDragStart: (event: CalendarEvent, e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetDate: Date, targetHour?: number, e?: React.DragEvent) => void;
  selectedEventId?: string;
}

const WeekView: React.FC<WeekViewProps> = ({
  startDate,
  events,
  onEventClick,
  onEventEdit,
  onTimeSlotClick,
  onDragStart,
  onDragOver,
  onDrop,
  selectedEventId,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    return day;
  });

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    const dayStr = day.toDateString();
    return events.filter((event) => {
      const eventDayStr = event.start.toDateString();
      const eventHour = event.start.getHours();
      const eventEndHour = event.end.getHours();
      return eventDayStr === dayStr && eventHour <= hour && hour < eventEndHour;
    });
  };

  const today = new Date();
  const todayStr = today.toDateString();

  return (
    <div className="flex flex-col">
      {/* 星期标题 */}
      <div className="flex border-b border-gray-200">
        <div className="w-16 flex-shrink-0"></div>
        {days.map((day) => {
          const isToday = day.toDateString() === todayStr;
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
              key={day.toISOString()}
              className={`
                flex-1 p-3 text-center border-r border-gray-200 last:border-r-0
                ${isToday ? 'bg-blue-50' : ''}
              `}
            >
              <div
                className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}
              >
                {dayNames[day.getDay()]}
              </div>
              <div
                className={`text-lg font-bold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 时间网格 */}
      <div className="flex-1 overflow-y-auto max-h-96">
        {hours.map((hour) => (
          <div key={hour} className="flex border-b border-gray-100 min-h-12">
            {/* 时间标签 */}
            <div className="w-16 flex-shrink-0 p-2 text-xs text-gray-500 text-right">
              {hour.toString().padStart(2, '0')}:00
            </div>

            {/* 每天的时间槽 */}
            {days.map((day) => {
              const dayEvents = getEventsForDayAndHour(day, hour);
              const isToday = day.toDateString() === todayStr;

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={`
                    flex-1 border-r border-gray-100 last:border-r-0 p-1 cursor-pointer relative
                    hover:bg-gray-50 ${isToday ? 'bg-blue-25' : ''}
                  `}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(day, hour, e)}
                  onClick={() => onTimeSlotClick?.(day, hour)}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => onDragStart(event, e)}
                      className={`
                        w-full p-1 rounded text-white text-xs cursor-move mb-1
                        ${event.color} ${selectedEventId === event.id ? 'ring-1 ring-blue-400' : ''}
                        hover:opacity-90 transition-opacity
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onEventEdit?.(event);
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// 月视图组件
interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour?: number) => void;
  onDragStart: (event: CalendarEvent, e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetDate: Date, targetHour?: number, e?: React.DragEvent) => void;
  selectedEventId?: string;
}

const MonthView: React.FC<MonthViewProps> = ({
  date,
  events,
  onEventClick,
  onEventEdit,
  onTimeSlotClick,
  onDragStart,
  onDragOver,
  onDrop,
  selectedEventId,
}) => {
  // 获取月份的所有日期
  const getMonthDates = () => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // 获取月份第一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 获取第一周的开始日期（周日）
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    // 获取最后一周的结束日期（周六）
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getEventsForDate = (targetDate: Date) => {
    const targetDateStr = targetDate.toDateString();
    return events.filter(
      (event) => event.start.toDateString() === targetDateStr
    );
  };

  const monthDates = getMonthDates();
  const weeks = [];

  // 将日期分组为周
  for (let i = 0; i < monthDates.length; i += 7) {
    weeks.push(monthDates.slice(i, i + 7));
  }

  const today = new Date();
  const todayStr = today.toDateString();
  const currentMonth = date.getMonth();

  return (
    <div className="flex flex-col">
      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="flex-1">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-gray-200 last:border-b-0"
          >
            {week.map((dayDate) => {
              const dayEvents = getEventsForDate(dayDate);
              const isToday = dayDate.toDateString() === todayStr;
              const isCurrentMonth = dayDate.getMonth() === currentMonth;

              return (
                <div
                  key={dayDate.toISOString()}
                  className={`
                    min-h-24 p-2 border-r border-gray-200 last:border-r-0 cursor-pointer
                    ${isToday ? 'bg-blue-50' : ''}
                    ${!isCurrentMonth ? 'bg-gray-50' : 'hover:bg-gray-50'}
                  `}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(dayDate, undefined, e)}
                  onClick={() => onTimeSlotClick?.(dayDate)}
                >
                  {/* 日期数字 */}
                  <div
                    className={`
                    text-sm font-medium mb-1
                    ${
                      isToday
                        ? 'text-blue-900 bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center'
                        : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }
                  `}
                  >
                    {dayDate.getDate()}
                  </div>

                  {/* 事件列表 */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => onDragStart(event, e)}
                        className={`
                          p-1 rounded text-white text-xs cursor-move truncate
                          ${event.color} ${selectedEventId === event.id ? 'ring-1 ring-blue-400' : ''}
                          hover:opacity-90 transition-opacity
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onEventEdit?.(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}

                    {/* 更多事件指示器 */}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 3} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
