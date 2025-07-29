/**
 * GTD工具数据验证函数
 * 提供各种数据模型的验证功能
 */

import type {
  InboxItem,
  Context,
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  ProcessDecision,
} from '../types/interfaces';
import {
  Priority,
  ActionStatus,
  ProjectStatus,
  InputType,
  ActionType,
} from '../types/enums';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 生成唯一ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 通用验证函数
 */
export const validateRequired = (
  value: unknown,
  fieldName: string
): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}是必填字段`;
  }
  return null;
};

export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength = 0,
  maxLength = 1000
): string | null => {
  if (value.length < minLength) {
    return `${fieldName}长度不能少于${minLength}个字符`;
  }
  if (value.length > maxLength) {
    return `${fieldName}长度不能超过${maxLength}个字符`;
  }
  return null;
};

export const validateDate = (value: Date, fieldName: string): string | null => {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return `${fieldName}必须是有效的日期`;
  }
  return null;
};

export const validateEnum = <T>(
  value: T,
  enumObject: Record<string, T>,
  fieldName: string
): string | null => {
  const validValues = Object.values(enumObject);
  if (!validValues.includes(value)) {
    return `${fieldName}必须是以下值之一: ${validValues.join(', ')}`;
  }
  return null;
};

/**
 * 工作篮项目验证
 */
export const validateInboxItem = (
  item: Partial<InboxItem>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const contentError = validateRequired(item.content, '内容');
  if (contentError) errors.push(contentError);

  const typeError = validateRequired(item.type, '类型');
  if (typeError) errors.push(typeError);

  // 内容长度验证
  if (item.content) {
    const lengthError = validateStringLength(item.content, '内容', 1, 5000);
    if (lengthError) errors.push(lengthError);
  }

  // 类型枚举验证
  if (item.type) {
    const enumError = validateEnum(item.type, InputType, '输入类型');
    if (enumError) errors.push(enumError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 情境验证
 */
export const validateContext = (
  context: Partial<Context>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const nameError = validateRequired(context.name, '名称');
  if (nameError) errors.push(nameError);

  const colorError = validateRequired(context.color, '颜色');
  if (colorError) errors.push(colorError);

  // 名称长度验证
  if (context.name) {
    const lengthError = validateStringLength(context.name, '名称', 1, 50);
    if (lengthError) errors.push(lengthError);
  }

  // 颜色格式验证
  if (context.color && !/^#[0-9A-Fa-f]{6}$/.test(context.color)) {
    errors.push('颜色必须是有效的十六进制格式 (例如: #FF0000)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 行动验证
 */
export const validateAction = (action: Partial<Action>): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const titleError = validateRequired(action.title, '标题');
  if (titleError) errors.push(titleError);

  const contextIdError = validateRequired(action.contextId, '情境ID');
  if (contextIdError) errors.push(contextIdError);

  const priorityError = validateRequired(action.priority, '优先级');
  if (priorityError) errors.push(priorityError);

  const statusError = validateRequired(action.status, '状态');
  if (statusError) errors.push(statusError);

  // 标题长度验证
  if (action.title) {
    const lengthError = validateStringLength(action.title, '标题', 1, 200);
    if (lengthError) errors.push(lengthError);
  }

  // 枚举验证
  if (action.priority) {
    const enumError = validateEnum(action.priority, Priority, '优先级');
    if (enumError) errors.push(enumError);
  }

  if (action.status) {
    const enumError = validateEnum(action.status, ActionStatus, '状态');
    if (enumError) errors.push(enumError);
  }

  // 预估时间验证
  if (action.estimatedTime !== undefined && action.estimatedTime < 0) {
    errors.push('预估时间不能为负数');
  }

  // 截止日期验证
  if (action.dueDate) {
    const dateError = validateDate(action.dueDate, '截止日期');
    if (dateError) errors.push(dateError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 项目验证
 */
export const validateProject = (
  project: Partial<Project>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const titleError = validateRequired(project.title, '标题');
  if (titleError) errors.push(titleError);

  const statusError = validateRequired(project.status, '状态');
  if (statusError) errors.push(statusError);

  // 标题长度验证
  if (project.title) {
    const lengthError = validateStringLength(project.title, '标题', 1, 200);
    if (lengthError) errors.push(lengthError);
  }

  // 状态枚举验证
  if (project.status) {
    const enumError = validateEnum(project.status, ProjectStatus, '项目状态');
    if (enumError) errors.push(enumError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 等待项目验证
 */
export const validateWaitingItem = (
  item: Partial<WaitingItem>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const titleError = validateRequired(item.title, '标题');
  if (titleError) errors.push(titleError);

  const waitingForError = validateRequired(item.waitingFor, '等待对象');
  if (waitingForError) errors.push(waitingForError);

  // 标题长度验证
  if (item.title) {
    const lengthError = validateStringLength(item.title, '标题', 1, 200);
    if (lengthError) errors.push(lengthError);
  }

  // 跟进日期验证
  if (item.followUpDate) {
    const dateError = validateDate(item.followUpDate, '跟进日期');
    if (dateError) errors.push(dateError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 日程项目验证
 */
export const validateCalendarItem = (
  item: Partial<CalendarItem>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const titleError = validateRequired(item.title, '标题');
  if (titleError) errors.push(titleError);

  const startTimeError = validateRequired(item.startTime, '开始时间');
  if (startTimeError) errors.push(startTimeError);

  // 标题长度验证
  if (item.title) {
    const lengthError = validateStringLength(item.title, '标题', 1, 200);
    if (lengthError) errors.push(lengthError);
  }

  // 时间验证
  if (item.startTime) {
    const dateError = validateDate(item.startTime, '开始时间');
    if (dateError) errors.push(dateError);
  }

  if (item.endTime) {
    const dateError = validateDate(item.endTime, '结束时间');
    if (dateError) errors.push(dateError);

    // 结束时间必须晚于开始时间
    if (item.startTime && item.endTime <= item.startTime) {
      errors.push('结束时间必须晚于开始时间');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 处理决策验证
 */
export const validateProcessDecision = (
  decision: Partial<ProcessDecision>
): ValidationResult => {
  const errors: string[] = [];

  // 必填字段验证
  const isActionableError = validateRequired(
    decision.isActionable,
    '是否可行动'
  );
  if (isActionableError) errors.push(isActionableError);

  const actionTypeError = validateRequired(decision.actionType, '行动类型');
  if (actionTypeError) errors.push(actionTypeError);

  // 行动类型枚举验证
  if (decision.actionType) {
    const enumError = validateEnum(decision.actionType, ActionType, '行动类型');
    if (enumError) errors.push(enumError);
  }

  // 优先级枚举验证
  if (decision.priority) {
    const enumError = validateEnum(decision.priority, Priority, '优先级');
    if (enumError) errors.push(enumError);
  }

  // 时间预估验证
  if (decision.timeEstimate !== undefined && decision.timeEstimate < 0) {
    errors.push('时间预估不能为负数');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
