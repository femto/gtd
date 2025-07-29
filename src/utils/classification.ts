/**
 * GTD分类决策工具
 * 实现GTD方法论中的分类决策逻辑
 */

import { ActionType, Priority } from '../types/enums';
import type { ProcessDecision, InboxItem } from '../types/interfaces';

/**
 * 2分钟规则判断
 * @param timeEstimate 预估完成时间（分钟）
 * @returns 是否应该立即执行
 */
export const shouldDoImmediately = (timeEstimate: number): boolean => {
  return timeEstimate <= 2;
};

/**
 * 根据时间估算和其他因素推荐行动类型
 * @param timeEstimate 预估完成时间（分钟）
 * @param canDelegate 是否可以委派
 * @returns 推荐的行动类型
 */
export const recommendActionType = (
  timeEstimate: number,
  canDelegate: boolean = false
): ActionType => {
  if (shouldDoImmediately(timeEstimate)) {
    return ActionType.DO;
  }

  if (canDelegate) {
    return ActionType.DELEGATE;
  }

  return ActionType.DEFER;
};

/**
 * 验证处理决策的完整性
 * @param decision 处理决策
 * @returns 验证结果和错误信息
 */
export const validateProcessDecision = (
  decision: Partial<ProcessDecision>
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (decision.actionType === undefined) {
    errors.push('必须选择处理方式');
  }

  if (decision.isActionable === undefined) {
    errors.push('必须确定是否需要行动');
  }

  // 如果是可行动项目，需要额外验证
  if (decision.isActionable) {
    if (!decision.context && decision.actionType !== ActionType.DELETE) {
      errors.push('可行动项目必须选择情境');
    }

    if (decision.timeEstimate !== undefined && decision.timeEstimate <= 0) {
      errors.push('时间估算必须大于0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 创建完整的处理决策
 * @param item 工作篮项目
 * @param isActionable 是否需要行动
 * @param actionType 行动类型
 * @param options 其他选项
 * @returns 完整的处理决策
 */
export const createProcessDecision = (
  _item: InboxItem,
  isActionable: boolean,
  actionType: ActionType,
  options: {
    timeEstimate?: number;
    context?: string;
    priority?: Priority;
    notes?: string;
  } = {}
): ProcessDecision => {
  const decision: ProcessDecision = {
    isActionable,
    actionType,
    ...options,
  };

  // 如果没有指定优先级，设置默认值
  if (!decision.priority) {
    decision.priority = Priority.MEDIUM;
  }

  return decision;
};

/**
 * 获取行动类型的描述信息
 * @param actionType 行动类型
 * @returns 描述信息
 */
export const getActionTypeDescription = (
  actionType: ActionType
): {
  label: string;
  description: string;
  category: 'actionable' | 'non-actionable';
} => {
  const descriptions = {
    [ActionType.DO]: {
      label: '立即执行',
      description: '现在就做，通常用于2分钟内可完成的任务',
      category: 'actionable' as const,
    },
    [ActionType.DELEGATE]: {
      label: '委派他人',
      description: '交给别人处理，需要跟踪进展',
      category: 'actionable' as const,
    },
    [ActionType.DEFER]: {
      label: '延迟处理',
      description: '稍后处理，添加到行动清单',
      category: 'actionable' as const,
    },
    [ActionType.DELETE]: {
      label: '删除',
      description: '垃圾信息，直接删除',
      category: 'non-actionable' as const,
    },
    [ActionType.REFERENCE]: {
      label: '参考资料',
      description: '保存为参考，可能以后有用',
      category: 'non-actionable' as const,
    },
    [ActionType.SOMEDAY]: {
      label: '将来/也许',
      description: '可能以后会做的事情',
      category: 'non-actionable' as const,
    },
  };

  return descriptions[actionType];
};

/**
 * 获取可行动项目的处理选项
 * @returns 可行动项目的处理选项列表
 */
export const getActionableOptions = () => {
  return [ActionType.DO, ActionType.DELEGATE, ActionType.DEFER].map((type) => ({
    type,
    ...getActionTypeDescription(type),
  }));
};

/**
 * 获取非行动项目的处理选项
 * @returns 非行动项目的处理选项列表
 */
export const getNonActionableOptions = () => {
  return [ActionType.DELETE, ActionType.REFERENCE, ActionType.SOMEDAY].map(
    (type) => ({
      type,
      ...getActionTypeDescription(type),
    })
  );
};

/**
 * 根据项目内容智能推荐分类
 * @param content 项目内容
 * @returns 推荐的行动类型和置信度
 */
export const suggestActionType = (
  content: string
): {
  actionType: ActionType;
  confidence: number;
  reason: string;
} => {
  const lowerContent = content.toLowerCase();

  // 垃圾信息关键词
  const trashKeywords = ['垃圾', '删除', '无用', '错误'];
  if (trashKeywords.some((keyword) => lowerContent.includes(keyword))) {
    return {
      actionType: ActionType.DELETE,
      confidence: 0.8,
      reason: '包含垃圾信息关键词',
    };
  }

  // 参考资料关键词
  const referenceKeywords = ['资料', '文档', '链接', '网址', '参考'];
  if (referenceKeywords.some((keyword) => lowerContent.includes(keyword))) {
    return {
      actionType: ActionType.REFERENCE,
      confidence: 0.7,
      reason: '包含参考资料关键词',
    };
  }

  // 委派关键词
  const delegateKeywords = ['委派', '交给', '让', '请'];
  if (delegateKeywords.some((keyword) => lowerContent.includes(keyword))) {
    return {
      actionType: ActionType.DELEGATE,
      confidence: 0.6,
      reason: '包含委派相关关键词',
    };
  }

  // 快速任务关键词
  const quickTaskKeywords = ['发送', '回复', '确认', '检查'];
  if (quickTaskKeywords.some((keyword) => lowerContent.includes(keyword))) {
    return {
      actionType: ActionType.DO,
      confidence: 0.5,
      reason: '可能是快速任务',
    };
  }

  // 默认推荐延迟处理
  return {
    actionType: ActionType.DEFER,
    confidence: 0.3,
    reason: '默认推荐',
  };
};

/**
 * 计算处理决策的复杂度评分
 * @param decision 处理决策
 * @returns 复杂度评分（0-10，10为最复杂）
 */
export const calculateComplexityScore = (decision: ProcessDecision): number => {
  let score = 0;

  // 基础复杂度
  if (decision.isActionable) {
    score += 2;
  }

  // 时间复杂度
  if (decision.timeEstimate) {
    if (decision.timeEstimate > 60) {
      score += 3;
    } else if (decision.timeEstimate > 15) {
      score += 2;
    } else if (decision.timeEstimate > 2) {
      score += 1;
    }
  }

  // 优先级复杂度
  if (decision.priority) {
    switch (decision.priority) {
      case Priority.URGENT:
        score += 2;
        break;
      case Priority.HIGH:
        score += 1;
        break;
    }
  }

  // 行动类型复杂度
  switch (decision.actionType) {
    case ActionType.DELEGATE:
      score += 2; // 需要跟踪
      break;
    case ActionType.DEFER:
      score += 1; // 需要安排
      break;
  }

  return Math.min(score, 10);
};
