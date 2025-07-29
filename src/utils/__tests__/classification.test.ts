/**
 * 分类决策逻辑单元测试
 * 测试GTD分类决策的各种场景
 */

import { describe, it, expect } from 'vitest';
import {
  shouldDoImmediately,
  recommendActionType,
  validateProcessDecision,
  createProcessDecision,
  getActionTypeDescription,
  getActionableOptions,
  getNonActionableOptions,
  suggestActionType,
  calculateComplexityScore,
} from '../classification';
import { ActionType, Priority, InputType } from '../../types/enums';
import type { InboxItem, ProcessDecision } from '../../types/interfaces';

describe('classification utils', () => {
  const mockInboxItem: InboxItem = {
    id: 'test-item-1',
    content: '准备会议材料',
    type: InputType.TEXT,
    processed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('shouldDoImmediately', () => {
    it('应该对2分钟内的任务返回true', () => {
      expect(shouldDoImmediately(1)).toBe(true);
      expect(shouldDoImmediately(2)).toBe(true);
    });

    it('应该对超过2分钟的任务返回false', () => {
      expect(shouldDoImmediately(3)).toBe(false);
      expect(shouldDoImmediately(30)).toBe(false);
    });

    it('应该处理边界情况', () => {
      expect(shouldDoImmediately(0)).toBe(true);
      expect(shouldDoImmediately(2.1)).toBe(false);
    });
  });

  describe('recommendActionType', () => {
    it('应该推荐立即执行2分钟内的任务', () => {
      expect(recommendActionType(1)).toBe(ActionType.DO);
      expect(recommendActionType(2)).toBe(ActionType.DO);
    });

    it('应该推荐委派可委派的长任务', () => {
      expect(recommendActionType(30, true)).toBe(ActionType.DELEGATE);
      expect(recommendActionType(5, true)).toBe(ActionType.DELEGATE);
    });

    it('应该推荐延迟处理不可委派的长任务', () => {
      expect(recommendActionType(30, false)).toBe(ActionType.DEFER);
      expect(recommendActionType(5)).toBe(ActionType.DEFER);
    });

    it('应该优先考虑2分钟规则而不是委派', () => {
      expect(recommendActionType(1, true)).toBe(ActionType.DO);
    });
  });

  describe('validateProcessDecision', () => {
    it('应该验证完整的可行动决策', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        context: 'office',
        priority: Priority.MEDIUM,
        timeEstimate: 30,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证完整的非行动决策', () => {
      const decision: ProcessDecision = {
        isActionable: false,
        actionType: ActionType.REFERENCE,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测缺少行动类型', () => {
      const decision: Partial<ProcessDecision> = {
        isActionable: true,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('必须选择处理方式');
    });

    it('应该检测缺少可行动性判断', () => {
      const decision: Partial<ProcessDecision> = {
        actionType: ActionType.DO,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('必须确定是否需要行动');
    });

    it('应该检测可行动项目缺少情境', () => {
      const decision: Partial<ProcessDecision> = {
        isActionable: true,
        actionType: ActionType.DEFER,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('可行动项目必须选择情境');
    });

    it('应该允许删除操作不需要情境', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DELETE,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(true);
    });

    it('应该检测无效的时间估算', () => {
      const decision: Partial<ProcessDecision> = {
        isActionable: true,
        actionType: ActionType.DEFER,
        context: 'office',
        timeEstimate: 0,
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('时间估算必须大于0');
    });

    it('应该收集多个验证错误', () => {
      const decision: Partial<ProcessDecision> = {
        // 缺少 isActionable 和 actionType
      };

      const result = validateProcessDecision(decision);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('createProcessDecision', () => {
    it('应该创建基本的处理决策', () => {
      const decision = createProcessDecision(
        mockInboxItem,
        true,
        ActionType.DO
      );

      expect(decision.isActionable).toBe(true);
      expect(decision.actionType).toBe(ActionType.DO);
      expect(decision.priority).toBe(Priority.MEDIUM); // 默认优先级
    });

    it('应该创建带选项的处理决策', () => {
      const decision = createProcessDecision(
        mockInboxItem,
        true,
        ActionType.DEFER,
        {
          timeEstimate: 30,
          context: 'office',
          priority: Priority.HIGH,
          notes: '重要会议',
        }
      );

      expect(decision.timeEstimate).toBe(30);
      expect(decision.context).toBe('office');
      expect(decision.priority).toBe(Priority.HIGH);
      expect(decision.notes).toBe('重要会议');
    });

    it('应该保留自定义优先级', () => {
      const decision = createProcessDecision(
        mockInboxItem,
        true,
        ActionType.DO,
        { priority: Priority.URGENT }
      );

      expect(decision.priority).toBe(Priority.URGENT);
    });
  });

  describe('getActionTypeDescription', () => {
    it('应该返回所有行动类型的描述', () => {
      const actionTypes = Object.values(ActionType);

      actionTypes.forEach((type) => {
        const description = getActionTypeDescription(type);
        expect(description.label).toBeTruthy();
        expect(description.description).toBeTruthy();
        expect(['actionable', 'non-actionable']).toContain(
          description.category
        );
      });
    });

    it('应该正确分类可行动和非行动类型', () => {
      expect(getActionTypeDescription(ActionType.DO).category).toBe(
        'actionable'
      );
      expect(getActionTypeDescription(ActionType.DELEGATE).category).toBe(
        'actionable'
      );
      expect(getActionTypeDescription(ActionType.DEFER).category).toBe(
        'actionable'
      );

      expect(getActionTypeDescription(ActionType.DELETE).category).toBe(
        'non-actionable'
      );
      expect(getActionTypeDescription(ActionType.REFERENCE).category).toBe(
        'non-actionable'
      );
      expect(getActionTypeDescription(ActionType.SOMEDAY).category).toBe(
        'non-actionable'
      );
    });
  });

  describe('getActionableOptions', () => {
    it('应该返回所有可行动选项', () => {
      const options = getActionableOptions();

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.type)).toEqual([
        ActionType.DO,
        ActionType.DELEGATE,
        ActionType.DEFER,
      ]);

      options.forEach((option) => {
        expect(option.category).toBe('actionable');
      });
    });
  });

  describe('getNonActionableOptions', () => {
    it('应该返回所有非行动选项', () => {
      const options = getNonActionableOptions();

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.type)).toEqual([
        ActionType.DELETE,
        ActionType.REFERENCE,
        ActionType.SOMEDAY,
      ]);

      options.forEach((option) => {
        expect(option.category).toBe('non-actionable');
      });
    });
  });

  describe('suggestActionType', () => {
    it('应该识别垃圾信息', () => {
      const suggestions = [
        suggestActionType('这是垃圾邮件'),
        suggestActionType('请删除这个'),
        suggestActionType('无用的信息'),
        suggestActionType('错误的内容'),
      ];

      suggestions.forEach((suggestion) => {
        expect(suggestion.actionType).toBe(ActionType.DELETE);
        expect(suggestion.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该识别参考资料', () => {
      const suggestions = [
        suggestActionType('保存这个资料'),
        suggestActionType('有用的文档'),
        suggestActionType('参考链接'),
        suggestActionType('网址收藏'),
      ];

      suggestions.forEach((suggestion) => {
        expect(suggestion.actionType).toBe(ActionType.REFERENCE);
        expect(suggestion.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该识别委派任务', () => {
      const suggestions = [
        suggestActionType('委派给小王'),
        suggestActionType('交给团队处理'),
        suggestActionType('让助理安排'),
        suggestActionType('请经理审批'),
      ];

      suggestions.forEach((suggestion) => {
        expect(suggestion.actionType).toBe(ActionType.DELEGATE);
        expect(suggestion.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该识别快速任务', () => {
      const suggestions = [
        suggestActionType('发送邮件'),
        suggestActionType('回复消息'),
        suggestActionType('确认时间'),
        suggestActionType('检查状态'),
      ];

      suggestions.forEach((suggestion) => {
        expect(suggestion.actionType).toBe(ActionType.DO);
        expect(suggestion.confidence).toBeGreaterThan(0.3);
      });
    });

    it('应该为普通内容提供默认建议', () => {
      const suggestion = suggestActionType('准备会议材料');

      expect(suggestion.actionType).toBe(ActionType.DEFER);
      expect(suggestion.confidence).toBeGreaterThan(0);
      expect(suggestion.reason).toBeTruthy();
    });

    it('应该处理空内容', () => {
      const suggestion = suggestActionType('');

      expect(suggestion.actionType).toBe(ActionType.DEFER);
      expect(suggestion.confidence).toBeGreaterThan(0);
    });
  });

  describe('calculateComplexityScore', () => {
    it('应该为简单的非行动项目返回低分', () => {
      const decision: ProcessDecision = {
        isActionable: false,
        actionType: ActionType.DELETE,
      };

      const score = calculateComplexityScore(decision);
      expect(score).toBe(0);
    });

    it('应该为基本行动项目返回适中分数', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DO,
        priority: Priority.MEDIUM,
        timeEstimate: 5,
      };

      const score = calculateComplexityScore(decision);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(5);
    });

    it('应该为复杂项目返回高分', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DELEGATE,
        priority: Priority.URGENT,
        timeEstimate: 120,
      };

      const score = calculateComplexityScore(decision);
      expect(score).toBeGreaterThan(5);
    });

    it('应该限制最大分数为10', () => {
      const decision: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DELEGATE,
        priority: Priority.URGENT,
        timeEstimate: 1000,
      };

      const score = calculateComplexityScore(decision);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('应该根据时间估算调整分数', () => {
      const shortTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        timeEstimate: 5,
      };

      const mediumTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        timeEstimate: 30,
      };

      const longTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        timeEstimate: 120,
      };

      expect(calculateComplexityScore(shortTask)).toBeLessThan(
        calculateComplexityScore(mediumTask)
      );
      expect(calculateComplexityScore(mediumTask)).toBeLessThan(
        calculateComplexityScore(longTask)
      );
    });

    it('应该根据优先级调整分数', () => {
      const lowPriority: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        priority: Priority.LOW,
      };

      const highPriority: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        priority: Priority.HIGH,
      };

      const urgentPriority: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
        priority: Priority.URGENT,
      };

      expect(calculateComplexityScore(lowPriority)).toBeLessThan(
        calculateComplexityScore(highPriority)
      );
      expect(calculateComplexityScore(highPriority)).toBeLessThan(
        calculateComplexityScore(urgentPriority)
      );
    });

    it('应该根据行动类型调整分数', () => {
      const doTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DO,
      };

      const deferTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DEFER,
      };

      const delegateTask: ProcessDecision = {
        isActionable: true,
        actionType: ActionType.DELEGATE,
      };

      expect(calculateComplexityScore(doTask)).toBeLessThan(
        calculateComplexityScore(deferTask)
      );
      expect(calculateComplexityScore(deferTask)).toBeLessThan(
        calculateComplexityScore(delegateTask)
      );
    });
  });
});
