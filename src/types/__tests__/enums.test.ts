/**
 * 枚举类型单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  Priority,
  ActionStatus,
  ProjectStatus,
  InputType,
  ActionType,
} from '../enums';

describe('Enums', () => {
  describe('Priority', () => {
    it('应该包含所有优先级选项', () => {
      expect(Priority.LOW).toBe('low');
      expect(Priority.MEDIUM).toBe('medium');
      expect(Priority.HIGH).toBe('high');
      expect(Priority.URGENT).toBe('urgent');
    });

    it('应该包含4个优先级选项', () => {
      const values = Object.values(Priority);
      expect(values).toHaveLength(4);
    });
  });

  describe('ActionStatus', () => {
    it('应该包含所有行动状态选项', () => {
      expect(ActionStatus.NEXT).toBe('next');
      expect(ActionStatus.WAITING).toBe('waiting');
      expect(ActionStatus.SCHEDULED).toBe('scheduled');
      expect(ActionStatus.COMPLETED).toBe('completed');
      expect(ActionStatus.CANCELLED).toBe('cancelled');
    });

    it('应该包含5个状态选项', () => {
      const values = Object.values(ActionStatus);
      expect(values).toHaveLength(5);
    });
  });

  describe('ProjectStatus', () => {
    it('应该包含所有项目状态选项', () => {
      expect(ProjectStatus.ACTIVE).toBe('active');
      expect(ProjectStatus.ON_HOLD).toBe('on_hold');
      expect(ProjectStatus.COMPLETED).toBe('completed');
      expect(ProjectStatus.CANCELLED).toBe('cancelled');
    });

    it('应该包含4个状态选项', () => {
      const values = Object.values(ProjectStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('InputType', () => {
    it('应该包含所有输入类型选项', () => {
      expect(InputType.TEXT).toBe('text');
      expect(InputType.VOICE).toBe('voice');
      expect(InputType.IMAGE).toBe('image');
    });

    it('应该包含3个输入类型选项', () => {
      const values = Object.values(InputType);
      expect(values).toHaveLength(3);
    });
  });

  describe('ActionType', () => {
    it('应该包含所有行动类型选项', () => {
      expect(ActionType.DO).toBe('do');
      expect(ActionType.DELEGATE).toBe('delegate');
      expect(ActionType.DEFER).toBe('defer');
      expect(ActionType.DELETE).toBe('delete');
      expect(ActionType.REFERENCE).toBe('reference');
      expect(ActionType.SOMEDAY).toBe('someday');
    });

    it('应该包含6个行动类型选项', () => {
      const values = Object.values(ActionType);
      expect(values).toHaveLength(6);
    });
  });
});
