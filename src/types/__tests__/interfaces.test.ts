/**
 * 接口类型单元测试
 */

import { describe, it, expect } from 'vitest';
import type {
  InboxItem,
  Context,
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  ProcessDecision,
  ReviewData,
  SearchResult,
  FilterCriteria,
} from '../interfaces';
import {
  Priority,
  ActionStatus,
  ProjectStatus,
  InputType,
  ActionType,
} from '../enums';

describe('Interfaces', () => {
  describe('InboxItem', () => {
    it('应该创建有效的工作篮项目', () => {
      const item: InboxItem = {
        id: '1',
        content: '准备会议材料',
        type: InputType.TEXT,
        processed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(item.id).toBe('1');
      expect(item.content).toBe('准备会议材料');
      expect(item.type).toBe(InputType.TEXT);
      expect(item.processed).toBe(false);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('应该支持可选的元数据', () => {
      const item: InboxItem = {
        id: '1',
        content: '测试内容',
        type: InputType.VOICE,
        processed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { duration: 30, quality: 'high' },
      };

      expect(item.metadata).toEqual({ duration: 30, quality: 'high' });
    });
  });

  describe('Context', () => {
    it('应该创建有效的情境', () => {
      const context: Context = {
        id: '1',
        name: '办公室',
        description: '在办公室可以完成的任务',
        color: '#FF0000',
        icon: 'office',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(context.name).toBe('办公室');
      expect(context.color).toBe('#FF0000');
      expect(context.isActive).toBe(true);
    });
  });

  describe('Action', () => {
    it('应该创建有效的行动', () => {
      const action: Action = {
        id: '1',
        title: '写报告',
        description: '完成月度工作报告',
        contextId: 'ctx1',
        projectId: 'proj1',
        priority: Priority.HIGH,
        estimatedTime: 120,
        dueDate: new Date('2024-12-31'),
        status: ActionStatus.NEXT,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: '需要包含销售数据',
        tags: ['报告', '月度'],
      };

      expect(action.title).toBe('写报告');
      expect(action.priority).toBe(Priority.HIGH);
      expect(action.status).toBe(ActionStatus.NEXT);
      expect(action.estimatedTime).toBe(120);
      expect(action.tags).toEqual(['报告', '月度']);
    });

    it('应该支持完成时间', () => {
      const completedAction: Action = {
        id: '1',
        title: '已完成的任务',
        contextId: 'ctx1',
        priority: Priority.MEDIUM,
        status: ActionStatus.COMPLETED,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(completedAction.status).toBe(ActionStatus.COMPLETED);
      expect(completedAction.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Project', () => {
    it('应该创建有效的项目', () => {
      const project: Project = {
        id: '1',
        title: '网站重构',
        description: '重构公司官网',
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: '使用React技术栈',
        tags: ['技术', '网站'],
      };

      expect(project.title).toBe('网站重构');
      expect(project.status).toBe(ProjectStatus.ACTIVE);
      expect(project.tags).toEqual(['技术', '网站']);
    });
  });

  describe('WaitingItem', () => {
    it('应该创建有效的等待项目', () => {
      const waitingItem: WaitingItem = {
        id: '1',
        title: '等待审批',
        description: '等待经理审批预算申请',
        waitingFor: '张经理',
        followUpDate: new Date('2024-12-25'),
        actionId: 'action1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(waitingItem.title).toBe('等待审批');
      expect(waitingItem.waitingFor).toBe('张经理');
      expect(waitingItem.followUpDate).toBeInstanceOf(Date);
    });
  });

  describe('CalendarItem', () => {
    it('应该创建有效的日程项目', () => {
      const calendarItem: CalendarItem = {
        id: '1',
        title: '团队会议',
        description: '讨论项目进展',
        startTime: new Date('2024-12-20T10:00:00'),
        endTime: new Date('2024-12-20T11:00:00'),
        location: '会议室A',
        isAllDay: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        reminders: [new Date('2024-12-20T09:45:00')],
      };

      expect(calendarItem.title).toBe('团队会议');
      expect(calendarItem.isAllDay).toBe(false);
      expect(calendarItem.reminders).toHaveLength(1);
    });

    it('应该支持全天事件', () => {
      const allDayEvent: CalendarItem = {
        id: '1',
        title: '公司年会',
        startTime: new Date('2024-12-31'),
        isAllDay: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(allDayEvent.isAllDay).toBe(true);
    });
  });

  describe('ProcessDecision', () => {
    it('应该创建有效的处理决策', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        timeEstimate: 60,
        context: '办公室',
        priority: Priority.MEDIUM,
        notes: '需要更多信息',
      };

      expect(decision.isActionable).toBe(true);
      expect(decision.actionType).toBe(ActionType.DEFER);
      expect(decision.timeEstimate).toBe(60);
    });

    it('应该支持不可行动的决策', () => {
      const decision: ProcessDecision = {
        isActionable: false,
        actionType: ActionType.DELETE,
        notes: '垃圾信息',
      };

      expect(decision.isActionable).toBe(false);
      expect(decision.actionType).toBe(ActionType.DELETE);
    });
  });

  describe('ReviewData', () => {
    it('应该创建有效的回顾数据', () => {
      const reviewData: ReviewData = {
        date: new Date(),
        completedActions: 15,
        completedProjects: 2,
        pendingActions: 8,
        pendingProjects: 3,
        waitingItems: 4,
        notes: '本周进展良好',
      };

      expect(reviewData.completedActions).toBe(15);
      expect(reviewData.completedProjects).toBe(2);
      expect(reviewData.notes).toBe('本周进展良好');
    });
  });

  describe('SearchResult', () => {
    it('应该创建有效的搜索结果', () => {
      const mockAction: Action = {
        id: '1',
        title: '测试任务',
        contextId: 'ctx1',
        priority: Priority.MEDIUM,
        status: ActionStatus.NEXT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const searchResult: SearchResult = {
        type: 'action',
        item: mockAction,
        matches: ['title', 'description'],
        score: 0.85,
      };

      expect(searchResult.type).toBe('action');
      expect(searchResult.matches).toEqual(['title', 'description']);
      expect(searchResult.score).toBe(0.85);
    });
  });

  describe('FilterCriteria', () => {
    it('应该创建有效的过滤条件', () => {
      const criteria: FilterCriteria = {
        contexts: ['办公室', '家里'],
        priorities: [Priority.HIGH, Priority.URGENT],
        statuses: [ActionStatus.NEXT, ActionStatus.WAITING],
        dateRange: {
          start: new Date('2024-12-01'),
          end: new Date('2024-12-31'),
        },
        tags: ['重要', '紧急'],
        searchText: '会议',
      };

      expect(criteria.contexts).toEqual(['办公室', '家里']);
      expect(criteria.priorities).toEqual([Priority.HIGH, Priority.URGENT]);
      expect(criteria.searchText).toBe('会议');
    });

    it('应该支持空的过滤条件', () => {
      const criteria: FilterCriteria = {};

      expect(criteria.contexts).toBeUndefined();
      expect(criteria.searchText).toBeUndefined();
    });
  });
});
