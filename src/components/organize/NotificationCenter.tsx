/**
 * 通知中心组件
 * 显示和管理系统通知
 */

import React, { useState, useEffect } from 'react';
import {
  notificationService,
  type NotificationItem,
} from '../../utils/notification-service';
import { useGTDStore } from '../../store/gtd-store';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('unread');

  const { actions, waitingItems, calendarItems } = useGTDStore();

  useEffect(() => {
    // 监听通知更新
    const handleNotificationsUpdate = (
      updatedNotifications: NotificationItem[]
    ) => {
      setNotifications(updatedNotifications);
    };

    notificationService.addListener(handleNotificationsUpdate);

    // 初始加载通知
    setNotifications(notificationService.getNotifications());

    // 触发通知检查
    notificationService.triggerCheck(actions, waitingItems, calendarItems);

    return () => {
      notificationService.removeListener(handleNotificationsUpdate);
    };
  }, [actions, waitingItems, calendarItems]);

  // 过滤通知
  const filteredNotifications = notifications
    .filter((notification) => {
      switch (filter) {
        case 'unread':
          return !notification.dismissed;
        case 'urgent':
          return notification.priority === 'urgent' && !notification.dismissed;
        case 'all':
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // 按优先级和时间排序
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  const handleNotificationClick = (notification: NotificationItem) => {
    notificationService.dismissNotification(notification.id);
    onNotificationClick?.(notification);
  };

  const handleDismissAll = () => {
    notificationService.dismissAllNotifications();
  };

  const handleRemoveNotification = (
    notificationId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    notificationService.removeNotification(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'low':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'waiting':
        return '⏳';
      case 'due_date':
        return '📅';
      case 'overdue':
        return '🚨';
      case 'calendar':
        return '🔔';
      default:
        return '📢';
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return timestamp.toLocaleDateString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />

      {/* 通知面板 */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">通知中心</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 过滤器 */}
          <div className="flex items-center space-x-2 p-4 border-b border-gray-200">
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              未读 ({notificationService.getUnreadNotifications().length})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'urgent'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              紧急 (
              {notificationService.getNotificationsByPriority('urgent').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
          </div>

          {/* 操作按钮 */}
          {filteredNotifications.some((n) => !n.dismissed) && (
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={handleDismissAll}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                标记全部为已读
              </button>
            </div>
          )}

          {/* 通知列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-4xl mb-4">🔕</div>
                <p className="text-center">
                  {filter === 'unread'
                    ? '没有未读通知'
                    : filter === 'urgent'
                      ? '没有紧急通知'
                      : '没有通知'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 cursor-pointer hover:bg-gray-50 transition-colors
                      ${notification.dismissed ? 'opacity-60' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 图标 */}
                      <div className="flex-shrink-0 text-lg">
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          <button
                            onClick={(e) =>
                              handleRemoveNotification(notification.id, e)
                            }
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(notification.timestamp)}
                          </span>

                          <span
                            className={`
                            px-2 py-1 text-xs rounded-full border
                            ${getPriorityColor(notification.priority)}
                          `}
                          >
                            {notification.priority === 'urgent'
                              ? '紧急'
                              : notification.priority === 'high'
                                ? '高'
                                : notification.priority === 'medium'
                                  ? '中'
                                  : '低'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 未读指示器 */}
                    {!notification.dismissed && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部设置 */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                // 这里可以打开通知设置对话框
                console.log('打开通知设置');
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              通知设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 通知图标组件
interface NotificationIconProps {
  onClick: () => void;
  className?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  onClick,
  className = '',
}) => {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setNotificationCount(notificationService.getNotificationCount());
    };

    notificationService.addListener(updateCount);
    updateCount(); // 初始更新

    return () => {
      notificationService.removeListener(updateCount);
    };
  }, []);

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      <span className="text-xl">🔔</span>
      {notificationCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {notificationCount > 99 ? '99+' : notificationCount}
        </span>
      )}
    </button>
  );
};
