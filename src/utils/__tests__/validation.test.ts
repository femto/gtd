/**
 * 数据验证函数单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateStringLength,
  validateDate,
  validateEnum,
  validateInboxItem,
  validateContext,
  validateAction,
  validateProject,
  validateWaitingItem,
  validateCalendarItem,
  validateProcessDecision,
} from '../validation';
import {
  Priority,
  ActionStatus,
  ProjectStatus,
  InputType,
  ActionType,
} from '../../types/enums';

describe('Validation Functions', () => {
  describe('validateRequired', () => {
    it('应该通过非空值验证', () => {
      expect(validateRequired('test', '字段')).toBeNull();
      expect(validateRequired(123, '字段')).toBeNull();
      expect(validateRequired(true, '字段')).toBeNull();
    });

    it('应该拒绝空值', () => {
      expect(validateRequired(null, '字段')).toBe('字段是必填字段');
      expect(validateRequired(undefined, '字段')).toBe('字段是必填字段');
      expect(validateRequired('', '字段')).toBe('字段是必填字段');
    });
  });

  describe('validateStringLength', () => {
    it('应该通过有效长度验证', () => {
      expect(validateStringLength('test', '字段', 1, 10)).toBeNull();
      expect(validateStringLength('hello world', '字段', 5, 20)).toBeNull();
    });

    it('应该拒绝过短的字符串', () => {
      expect(validateStringLength('a', '字段', 5, 10)).toBe(
        '字段长度不能少于5个字符'
      );
    });

    it('应该拒绝过长的字符串', () => {
      expect(validateStringLength('very long string', '字段', 1, 5)).toBe(
        '字段长度不能超过5个字符'
      );
    });
  });

  describe('validateDate', () => {
    it('应该通过有效日期验证', () => {
      expect(validateDate(new Date(), '日期')).toBeNull();
      expect(validateDate(new Date('2024-12-20'), '日期')).toBeNull();
    });

    it('应该拒绝无效日期', () => {
      expect(validateDate(new Date('invalid'), '日期')).toBe(
        '日期必须是有效的日期'
      );
      expect(validateDate({} as Date, '日期')).toBe('日期必须是有效的日期');
    });
  });

  describe('validateEnum', () => {
    it('应该通过有效枚举值验证', () => {
      expect(validateEnum(Priority.HIGH, Priority, '优先级')).toBeNull();
      expect(validateEnum(ActionStatus.NEXT, ActionStatus, '状态')).toBeNull();
    });

    it('应该拒绝无效枚举值', () => {
      expect(validateEnum('invalid' as Priority, Priority, '优先级')).toContain(
        '优先级必须是以下值之一'
      );
    });
  });

  describe('validateInboxItem', () => {
    it('应该通过有效工作篮项目验证', () => {
      const item = {
        content: '测试内容',
        type: InputType.TEXT,
      };
      const result = validateInboxItem(item);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的项目', () => {
      const item = {};
      const result = validateInboxItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容是必填字段');
      expect(result.errors).toContain('类型是必填字段');
    });

    it('应该拒绝内容过长的项目', () => {
      const item = {
        content: 'a'.repeat(6000),
        type: InputType.TEXT,
      };
      const result = validateInboxItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容长度不能超过5000个字符');
    });

    it('应该拒绝无效的输入类型', () => {
      const item = {
        content: '测试内容',
        type: 'invalid' as InputType,
      };
      const result = validateInboxItem(item);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('输入类型必须是以下值之一')
        )
      ).toBe(true);
    });
  });

  describe('validateContext', () => {
    it('应该通过有效情境验证', () => {
      const context = {
        name: '办公室',
        color: '#FF0000',
      };
      const result = validateContext(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的情境', () => {
      const context = {};
      const result = validateContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称是必填字段');
      expect(result.errors).toContain('颜色是必填字段');
    });

    it('应该拒绝无效的颜色格式', () => {
      const context = {
        name: '办公室',
        color: 'red',
      };
      const result = validateContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '颜色必须是有效的十六进制格式 (例如: #FF0000)'
      );
    });

    it('应该拒绝名称过长的情境', () => {
      const context = {
        name: 'a'.repeat(100),
        color: '#FF0000',
      };
      const result = validateContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称长度不能超过50个字符');
    });
  });

  describe('validateAction', () => {
    it('应该通过有效行动验证', () => {
      const action = {
        title: '写报告',
        contextId: 'ctx1',
        priority: Priority.HIGH,
        status: ActionStatus.NEXT,
      };
      const result = validateAction(action);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的行动', () => {
      const action = {};
      const result = validateAction(action);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('标题是必填字段');
      expect(result.errors).toContain('情境ID是必填字段');
      expect(result.errors).toContain('优先级是必填字段');
      expect(result.errors).toContain('状态是必填字段');
    });

    it('应该拒绝负数的预估时间', () => {
      const action = {
        title: '测试任务',
        contextId: 'ctx1',
        priority: Priority.MEDIUM,
        status: ActionStatus.NEXT,
        estimatedTime: -30,
      };
      const result = validateAction(action);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('预估时间不能为负数');
    });

    it('应该拒绝无效的截止日期', () => {
      const action = {
        title: '测试任务',
        contextId: 'ctx1',
        priority: Priority.MEDIUM,
        status: ActionStatus.NEXT,
        dueDate: new Date('invalid'),
      };
      const result = validateAction(action);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('截止日期必须是有效的日期');
    });
  });

  describe('validateProject', () => {
    it('应该通过有效项目验证', () => {
      const project = {
        title: '网站重构',
        status: ProjectStatus.ACTIVE,
      };
      const result = validateProject(project);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的项目', () => {
      const project = {};
      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('标题是必填字段');
      expect(result.errors).toContain('状态是必填字段');
    });

    it('应该拒绝无效的项目状态', () => {
      const project = {
        title: '测试项目',
        status: 'invalid' as ProjectStatus,
      };
      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('项目状态必须是以下值之一')
        )
      ).toBe(true);
    });
  });

  describe('validateWaitingItem', () => {
    it('应该通过有效等待项目验证', () => {
      const item = {
        title: '等待审批',
        waitingFor: '张经理',
      };
      const result = validateWaitingItem(item);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的等待项目', () => {
      const item = {};
      const result = validateWaitingItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('标题是必填字段');
      expect(result.errors).toContain('等待对象是必填字段');
    });

    it('应该拒绝无效的跟进日期', () => {
      const item = {
        title: '等待审批',
        waitingFor: '张经理',
        followUpDate: new Date('invalid'),
      };
      const result = validateWaitingItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('跟进日期必须是有效的日期');
    });
  });

  describe('validateCalendarItem', () => {
    it('应该通过有效日程项目验证', () => {
      const item = {
        title: '团队会议',
        startTime: new Date('2024-12-20T10:00:00'),
      };
      const result = validateCalendarItem(item);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的日程项目', () => {
      const item = {};
      const result = validateCalendarItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('标题是必填字段');
      expect(result.errors).toContain('开始时间是必填字段');
    });

    it('应该拒绝结束时间早于开始时间的日程', () => {
      const item = {
        title: '会议',
        startTime: new Date('2024-12-20T11:00:00'),
        endTime: new Date('2024-12-20T10:00:00'),
      };
      const result = validateCalendarItem(item);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('结束时间必须晚于开始时间');
    });
  });

  describe('validateProcessDecision', () => {
    it('应该通过有效处理决策验证', () => {
      const decision = {
        isActionable: true,
        actionType: ActionType.DEFER,
      };
      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必填字段的处理决策', () => {
      const decision = {};
      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('是否可行动是必填字段');
      expect(result.errors).toContain('行动类型是必填字段');
    });

    it('应该拒绝负数的时间预估', () => {
      const decision = {
        isActionable: true,
        actionType: ActionType.DO,
        timeEstimate: -15,
      };
      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('时间预估不能为负数');
    });

    it('应该拒绝无效的行动类型', () => {
      const decision = {
        isActionable: true,
        actionType: 'invalid' as ActionType,
      };
      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('行动类型必须是以下值之一')
        )
      ).toBe(true);
    });
  });
});
