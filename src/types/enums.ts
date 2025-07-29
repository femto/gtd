/**
 * GTD工具核心枚举类型定义
 * 定义系统中使用的所有枚举类型
 */

/**
 * 优先级枚举
 */
export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

/**
 * 行动状态枚举
 */
export const ActionStatus = {
  NEXT: 'next', // 下一步行动
  WAITING: 'waiting', // 等待他人
  SCHEDULED: 'scheduled', // 已安排时间
  COMPLETED: 'completed', // 已完成
  CANCELLED: 'cancelled', // 已取消
} as const;

export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

/**
 * 项目状态枚举
 */
export const ProjectStatus = {
  ACTIVE: 'active', // 活跃项目
  ON_HOLD: 'on_hold', // 暂停项目
  COMPLETED: 'completed', // 已完成项目
  CANCELLED: 'cancelled', // 已取消项目
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

/**
 * 输入类型枚举
 */
export const InputType = {
  TEXT: 'text',
  VOICE: 'voice',
  IMAGE: 'image',
} as const;

export type InputType = (typeof InputType)[keyof typeof InputType];

/**
 * 处理决策类型枚举
 */
export const ActionType = {
  DO: 'do', // 立即执行
  DELEGATE: 'delegate', // 委派他人
  DEFER: 'defer', // 延迟处理
  DELETE: 'delete', // 删除垃圾
  REFERENCE: 'reference', // 参考资料
  SOMEDAY: 'someday', // 将来/也许
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];
