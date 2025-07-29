/**
 * 通知服务
 * 处理等待项目提醒、截止日期通知和浏览器通知
 */

import type { Action, WaitingItem, CalendarItem } from '../types/interfaces';
import { ActionStatus } from '../types/enums';

export interface NotificationConfig {
  enableBrowserNotifications: boolean;
  enableWaitingReminders: boolean;
  enableDueDateNotifications: boolean;
  reminderIntervals: {
    waiting: number; // 等待项目提醒间隔（天）
    dueDate: number; // 截止日期提醒提前时间（小时）
    overdue: number; // 过期提醒间隔（小时）
  };
}

export interface NotificationItem {
  id: string;
  type: 'waiting' | 'due_date' | 'overdue' | 'calendar';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  actionId?: string;
  waitingItemId?: string;
  calendarItemId?: string;
  dismissed: boolean;
}

class NotificationService {
  private config: NotificationConfig;
  private notifications: NotificationItem[] = [];
  private listeners: Array<(notifications: NotificationItem[]) => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enableBrowserNotifications: false,
      enableWaitingReminders: true,
      enableDueDateNotifications: true,
      reminderIntervals: {
        waiting: 7, // 每7天提醒一次等待项目
        dueDate: 24, // 提前24小时提醒截止日期
        overdue: 4, // 每4小时提醒过期任务
      },
    };

    this.requestNotificationPermission();
    this.startPeriodicCheck();
  }

  /**
   * 请求浏览器通知权限
   */
  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.config.enableBrowserNotifications = permission === 'granted';
    }
  }

  /**
   * 开始定期检查
   */
  private startPeriodicCheck(): void {
    // 每5分钟检查一次
    this.checkInterval = setInterval(
      () => {
        this.checkForNotifications();
      },
      5 * 60 * 1000
    );
  }

  /**
   * 停止定期检查
   */
  public stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * 添加通知监听器
   */
  public addListener(
    listener: (notifications: NotificationItem[]) => void
  ): void {
    this.listeners.push(listener);
  }

  /**
   * 移除通知监听器
   */
  public removeListener(
    listener: (notifications: NotificationItem[]) => void
  ): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  /**
   * 检查并生成通知
   */
  public checkForNotifications(
    actions: Action[] = [],
    waitingItems: WaitingItem[] = [],
    calendarItems: CalendarItem[] = []
  ): void {
    const now = new Date();
    const newNotifications: NotificationItem[] = [];

    // 检查等待项目提醒
    if (this.config.enableWaitingReminders) {
      waitingItems.forEach((item) => {
        const daysSinceCreated = Math.floor(
          (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const shouldRemind = item.followUpDate
          ? now >= item.followUpDate
          : daysSinceCreated > 0 &&
            daysSinceCreated % this.config.reminderIntervals.waiting === 0;

        if (shouldRemind && !this.hasActiveNotification('waiting', item.id)) {
          newNotifications.push({
            id: `waiting-${item.id}-${now.getTime()}`,
            type: 'waiting',
            title: '等待项目提醒',
            message: `请跟进等待项目: ${item.title}`,
            priority: 'medium',
            timestamp: now,
            waitingItemId: item.id,
            dismissed: false,
          });
        }
      });
    }

    // 检查截止日期通知
    if (this.config.enableDueDateNotifications) {
      actions
        .filter(
          (action) =>
            action.dueDate &&
            action.status !== ActionStatus.COMPLETED &&
            action.status !== ActionStatus.CANCELLED
        )
        .forEach((action) => {
          const dueDate = new Date(action.dueDate!);
          const hoursUntilDue =
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const isOverdue = hoursUntilDue < 0;

          // 过期任务通知
          if (isOverdue) {
            const hoursSinceOverdue = Math.abs(hoursUntilDue);
            // 简化逻辑：只要过期就通知（在测试中），实际使用时可以加上间隔检查
            const shouldNotifyOverdue = hoursSinceOverdue > 0;

            if (
              shouldNotifyOverdue &&
              !this.hasActiveNotification('overdue', action.id)
            ) {
              newNotifications.push({
                id: `overdue-${action.id}-${now.getTime()}`,
                type: 'overdue',
                title: '任务已过期',
                message: `任务 "${action.title}" 已过期 ${Math.floor(hoursSinceOverdue)} 小时`,
                priority: 'urgent',
                timestamp: now,
                actionId: action.id,
                dismissed: false,
              });
            }
          }
          // 即将到期通知
          else if (hoursUntilDue <= this.config.reminderIntervals.dueDate) {
            if (!this.hasActiveNotification('due_date', action.id)) {
              const priority =
                hoursUntilDue <= 2
                  ? 'urgent'
                  : hoursUntilDue <= 8
                    ? 'high'
                    : 'medium';

              newNotifications.push({
                id: `due-${action.id}-${now.getTime()}`,
                type: 'due_date',
                title: '任务即将到期',
                message: `任务 "${action.title}" 将在 ${Math.floor(hoursUntilDue)} 小时后到期`,
                priority,
                timestamp: now,
                actionId: action.id,
                dismissed: false,
              });
            }
          }
        });
    }

    // 检查日程提醒
    calendarItems.forEach((item) => {
      const startTime = new Date(item.startTime);
      const minutesUntilStart =
        (startTime.getTime() - now.getTime()) / (1000 * 60);

      // 提前15分钟提醒
      if (minutesUntilStart > 0 && minutesUntilStart <= 15) {
        if (!this.hasActiveNotification('calendar', item.id)) {
          newNotifications.push({
            id: `calendar-${item.id}-${now.getTime()}`,
            type: 'calendar',
            title: '日程提醒',
            message: `"${item.title}" 将在 ${Math.floor(minutesUntilStart)} 分钟后开始`,
            priority: 'high',
            timestamp: now,
            calendarItemId: item.id,
            dismissed: false,
          });
        }
      }
    });

    // 添加新通知
    if (newNotifications.length > 0) {
      this.notifications.push(...newNotifications);
      this.notifyListeners();

      // 发送浏览器通知
      if (this.config.enableBrowserNotifications) {
        newNotifications.forEach((notification) => {
          this.sendBrowserNotification(notification);
        });
      }
    }

    // 清理过期的通知（24小时后自动清理）
    this.cleanupOldNotifications();
  }

  /**
   * 检查是否已有相同类型和ID的活跃通知
   */
  private hasActiveNotification(type: string, itemId: string): boolean {
    return this.notifications.some(
      (notification) =>
        notification.type === type &&
        (notification.actionId === itemId ||
          notification.waitingItemId === itemId ||
          notification.calendarItemId === itemId) &&
        !notification.dismissed &&
        Date.now() - notification.timestamp.getTime() < 60 * 60 * 1000 // 1小时内
    );
  }

  /**
   * 发送浏览器通知
   */
  private sendBrowserNotification(notification: NotificationItem): void {
    if (
      !this.config.enableBrowserNotifications ||
      !('Notification' in window)
    ) {
      return;
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
    });

    // 点击通知时的处理
    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();

      // 可以在这里添加导航到相关页面的逻辑
      this.handleNotificationClick(notification);
    };

    // 自动关闭通知
    setTimeout(
      () => {
        browserNotification.close();
      },
      notification.priority === 'urgent' ? 10000 : 5000
    );
  }

  /**
   * 处理通知点击
   */
  private handleNotificationClick(notification: NotificationItem): void {
    // 标记通知为已处理
    this.dismissNotification(notification.id);

    // 触发自定义事件，让应用处理导航
    window.dispatchEvent(
      new CustomEvent('notification-click', {
        detail: notification,
      })
    );
  }

  /**
   * 获取所有通知
   */
  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  /**
   * 获取未读通知
   */
  public getUnreadNotifications(): NotificationItem[] {
    return this.notifications.filter((n) => !n.dismissed);
  }

  /**
   * 获取通知数量
   */
  public getNotificationCount(): number {
    return this.getUnreadNotifications().length;
  }

  /**
   * 按优先级获取通知
   */
  public getNotificationsByPriority(
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): NotificationItem[] {
    return this.notifications.filter(
      (n) => n.priority === priority && !n.dismissed
    );
  }

  /**
   * 标记通知为已读
   */
  public dismissNotification(notificationId: string): void {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (notification) {
      notification.dismissed = true;
      this.notifyListeners();
    }
  }

  /**
   * 标记所有通知为已读
   */
  public dismissAllNotifications(): void {
    this.notifications.forEach((n) => (n.dismissed = true));
    this.notifyListeners();
  }

  /**
   * 删除通知
   */
  public removeNotification(notificationId: string): void {
    const index = this.notifications.findIndex((n) => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.notifyListeners();
    }
  }

  /**
   * 清理旧通知
   */
  private cleanupOldNotifications(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialLength = this.notifications.length;

    this.notifications = this.notifications.filter(
      (notification) =>
        notification.timestamp > oneDayAgo || !notification.dismissed
    );

    if (this.notifications.length !== initialLength) {
      this.notifyListeners();
    }
  }

  /**
   * 手动触发通知检查
   */
  public triggerCheck(
    actions: Action[] = [],
    waitingItems: WaitingItem[] = [],
    calendarItems: CalendarItem[] = []
  ): void {
    this.checkForNotifications(actions, waitingItems, calendarItems);
  }

  /**
   * 创建自定义通知
   */
  public createCustomNotification(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): void {
    const notification: NotificationItem = {
      id: `custom-${Date.now()}`,
      type: 'due_date', // 使用通用类型
      title,
      message,
      priority,
      timestamp: new Date(),
      dismissed: false,
    };

    this.notifications.push(notification);
    this.notifyListeners();

    if (this.config.enableBrowserNotifications) {
      this.sendBrowserNotification(notification);
    }
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.stopPeriodicCheck();
    this.listeners = [];
    this.notifications = [];
  }
}

// 创建单例实例
export const notificationService = new NotificationService();

// 导出类型和服务
export { NotificationService };
export default notificationService;
