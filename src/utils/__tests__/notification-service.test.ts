/**
 * 通知服务测试
 * 测试通知系统的各种功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationService,
  type NotificationConfig,
} from '../notification-service';
import type { Action, WaitingItem, CalendarItem } from '../../types/interfaces';
import { ActionStatus } from '../../types/enums';

// Mock Notification API
const mockNotification = vi.fn();
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: vi.fn().mockResolvedValue('granted'),
  writable: true,
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockActions: Action[];
  let mockWaitingItems: WaitingItem[];
  let mockCalendarItems: CalendarItem[];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();

    // 创建测试数据
    const now = new Date();

    mockActions = [
      {
        id: 'action-1',
        title: '完成报告',
        contextId: 'ctx-1',
        priority: 'high' as any,
        status: ActionStatus.NEXT,
        dueDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2小时后到期
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'action-2',
        title: '过期任务',
        contextId: 'ctx-1',
        priority: 'medium' as any,
        status: ActionStatus.NEXT,
        dueDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2小时前过期
        createdAt: now,
        updatedAt: now,
      },
    ];

    mockWaitingItems = [
      {
        id: 'waiting-1',
        title: '等待回复',
        waitingFor: '客户',
        followUpDate: new Date(now.getTime() - 1000), // 1秒前应该跟进
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7天前创建
        updatedAt: now,
      },
    ];

    mockCalendarItems = [
      {
        id: 'cal-1',
        title: '重要会议',
        startTime: new Date(now.getTime() + 10 * 60 * 1000), // 10分钟后开始
        isAllDay: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
  });

  afterEach(() => {
    service.destroy();
  });

  describe('配置管理', () => {
    it('应该有默认配置', () => {
      const config = service.getConfig();

      expect(config.enableWaitingReminders).toBe(true);
      expect(config.enableDueDateNotifications).toBe(true);
      expect(config.reminderIntervals.waiting).toBe(7);
      expect(config.reminderIntervals.dueDate).toBe(24);
      expect(config.reminderIntervals.overdue).toBe(4);
    });

    it('应该支持更新配置', () => {
      const newConfig: Partial<NotificationConfig> = {
        enableWaitingReminders: false,
        reminderIntervals: {
          waiting: 14,
          dueDate: 48,
          overdue: 8,
        },
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.enableWaitingReminders).toBe(false);
      expect(config.reminderIntervals.waiting).toBe(14);
      expect(config.reminderIntervals.dueDate).toBe(48);
      expect(config.reminderIntervals.overdue).toBe(8);
    });
  });

  describe('通知生成', () => {
    it('应该为即将到期的任务生成通知', () => {
      service.checkForNotifications(mockActions, [], []);

      const notifications = service.getNotifications();
      const dueDateNotifications = notifications.filter(
        (n) => n.type === 'due_date'
      );

      expect(dueDateNotifications).toHaveLength(1);
      expect(dueDateNotifications[0].title).toBe('任务即将到期');
      expect(dueDateNotifications[0].message).toContain('完成报告');
      expect(dueDateNotifications[0].priority).toBe('urgent');
    });

    it('应该为过期任务生成通知', () => {
      service.checkForNotifications(mockActions, [], []);

      const notifications = service.getNotifications();
      const overdueNotifications = notifications.filter(
        (n) => n.type === 'overdue'
      );

      expect(overdueNotifications).toHaveLength(1);
      expect(overdueNotifications[0].title).toBe('任务已过期');
      expect(overdueNotifications[0].message).toContain('过期任务');
      expect(overdueNotifications[0].priority).toBe('urgent');
    });

    it('应该为等待项目生成提醒', () => {
      service.checkForNotifications([], mockWaitingItems, []);

      const notifications = service.getNotifications();
      const waitingNotifications = notifications.filter(
        (n) => n.type === 'waiting'
      );

      expect(waitingNotifications).toHaveLength(1);
      expect(waitingNotifications[0].title).toBe('等待项目提醒');
      expect(waitingNotifications[0].message).toContain('等待回复');
      expect(waitingNotifications[0].priority).toBe('medium');
    });

    it('应该为即将开始的日程生成提醒', () => {
      service.checkForNotifications([], [], mockCalendarItems);

      const notifications = service.getNotifications();
      const calendarNotifications = notifications.filter(
        (n) => n.type === 'calendar'
      );

      expect(calendarNotifications).toHaveLength(1);
      expect(calendarNotifications[0].title).toBe('日程提醒');
      expect(calendarNotifications[0].message).toContain('重要会议');
      expect(calendarNotifications[0].priority).toBe('high');
    });

    it('不应该为已完成的任务生成通知', () => {
      const completedAction: Action = {
        ...mockActions[0],
        status: ActionStatus.COMPLETED,
        completedAt: new Date(),
      };

      service.checkForNotifications([completedAction], [], []);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('通知管理', () => {
    beforeEach(() => {
      // 生成一些测试通知
      service.checkForNotifications(
        mockActions,
        mockWaitingItems,
        mockCalendarItems
      );
    });

    it('应该返回所有通知', () => {
      const notifications = service.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('应该返回未读通知', () => {
      const unreadNotifications = service.getUnreadNotifications();
      expect(unreadNotifications.every((n) => !n.dismissed)).toBe(true);
    });

    it('应该返回正确的通知数量', () => {
      const count = service.getNotificationCount();
      const unreadCount = service.getUnreadNotifications().length;
      expect(count).toBe(unreadCount);
    });

    it('应该按优先级过滤通知', () => {
      const urgentNotifications = service.getNotificationsByPriority('urgent');
      expect(urgentNotifications.every((n) => n.priority === 'urgent')).toBe(
        true
      );
    });

    it('应该支持标记通知为已读', () => {
      const notifications = service.getNotifications();
      const firstNotification = notifications[0];

      service.dismissNotification(firstNotification.id);

      const updatedNotification = service
        .getNotifications()
        .find((n) => n.id === firstNotification.id);
      expect(updatedNotification?.dismissed).toBe(true);
    });

    it('应该支持标记所有通知为已读', () => {
      service.dismissAllNotifications();

      const unreadNotifications = service.getUnreadNotifications();
      expect(unreadNotifications).toHaveLength(0);
    });

    it('应该支持删除通知', () => {
      const notifications = service.getNotifications();
      const initialCount = notifications.length;
      const firstNotification = notifications[0];

      service.removeNotification(firstNotification.id);

      const updatedNotifications = service.getNotifications();
      expect(updatedNotifications).toHaveLength(initialCount - 1);
      expect(
        updatedNotifications.find((n) => n.id === firstNotification.id)
      ).toBeUndefined();
    });
  });

  describe('监听器管理', () => {
    it('应该支持添加和移除监听器', () => {
      const mockListener = vi.fn();

      service.addListener(mockListener);
      service.checkForNotifications(mockActions, [], []);

      expect(mockListener).toHaveBeenCalled();

      service.removeListener(mockListener);
      service.checkForNotifications([], mockWaitingItems, []);

      // 监听器被移除后不应该再被调用
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('应该在通知更新时通知监听器', () => {
      const mockListener = vi.fn();
      service.addListener(mockListener);

      service.createCustomNotification('测试', '测试消息');

      expect(mockListener).toHaveBeenCalled();
      const calledWith = mockListener.mock.calls[0][0];
      expect(calledWith.some((n: any) => n.title === '测试')).toBe(true);
    });
  });

  describe('自定义通知', () => {
    it('应该支持创建自定义通知', () => {
      service.createCustomNotification('自定义标题', '自定义消息', 'high');

      const notifications = service.getNotifications();
      const customNotification = notifications.find(
        (n) => n.title === '自定义标题'
      );

      expect(customNotification).toBeDefined();
      expect(customNotification?.message).toBe('自定义消息');
      expect(customNotification?.priority).toBe('high');
    });
  });

  describe('浏览器通知', () => {
    it('应该在配置启用时发送浏览器通知', () => {
      service.updateConfig({ enableBrowserNotifications: true });
      service.checkForNotifications(mockActions, [], []);

      // 验证浏览器通知被调用
      expect(mockNotification).toHaveBeenCalled();
    });

    it('应该在配置禁用时不发送浏览器通知', () => {
      service.updateConfig({ enableBrowserNotifications: false });
      service.checkForNotifications(mockActions, [], []);

      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('重复通知防护', () => {
    it('不应该为同一项目生成重复通知', () => {
      // 第一次检查
      service.checkForNotifications(mockActions, [], []);
      const firstCount = service.getNotifications().length;

      // 立即再次检查
      service.checkForNotifications(mockActions, [], []);
      const secondCount = service.getNotifications().length;

      expect(secondCount).toBe(firstCount);
    });
  });

  describe('通知清理', () => {
    it('应该清理旧的已读通知', () => {
      // 创建一个旧通知
      service.createCustomNotification('旧通知', '测试消息');
      const notifications = service.getNotifications();
      const oldNotification = notifications[0];

      // 标记为已读并修改时间戳为24小时前
      service.dismissNotification(oldNotification.id);
      oldNotification.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000);

      // 触发清理（通过检查通知）
      service.checkForNotifications([], [], []);

      const remainingNotifications = service.getNotifications();
      expect(
        remainingNotifications.find((n) => n.id === oldNotification.id)
      ).toBeUndefined();
    });
  });

  describe('服务销毁', () => {
    it('应该正确清理资源', () => {
      const mockListener = vi.fn();
      service.addListener(mockListener);

      service.destroy();

      // 验证监听器被清理
      expect(service.getNotifications()).toHaveLength(0);

      // 验证定时器被清理（通过检查不再触发通知）
      service.checkForNotifications(mockActions, [], []);
      expect(mockListener).not.toHaveBeenCalled();
    });
  });
});
