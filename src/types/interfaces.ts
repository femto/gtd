/**
 * GTD工具核心接口定义
 * 定义系统中使用的所有数据模型接口
 */

import {
  Priority,
  ActionStatus,
  ProjectStatus,
  InputType,
  ActionType,
} from './enums';

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作篮项目接口
 */
export interface InboxItem extends BaseEntity {
  content: string;
  type: InputType;
  processed: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 情境接口
 */
export interface Context extends BaseEntity {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isActive: boolean;
}

/**
 * 行动接口
 */
export interface Action extends BaseEntity {
  title: string;
  description?: string;
  contextId: string;
  projectId?: string;
  priority: Priority;
  estimatedTime?: number; // 预估时间(分钟)
  dueDate?: Date;
  status: ActionStatus;
  completedAt?: Date;
  progress?: number; // 进度百分比 (0-100)
  notes?: string;
  tags?: string[];
}

/**
 * 项目接口
 */
export interface Project extends BaseEntity {
  title: string;
  description?: string;
  status: ProjectStatus;
  completedAt?: Date;
  notes?: string;
  tags?: string[];
}

/**
 * 等待项目接口
 */
export interface WaitingItem extends BaseEntity {
  title: string;
  description?: string;
  waitingFor: string; // 等待的人或事
  followUpDate?: Date;
  actionId?: string;
  projectId?: string;
  notes?: string;
}

/**
 * 日程项目接口
 */
export interface CalendarItem extends BaseEntity {
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  actionId?: string;
  projectId?: string;
  isAllDay: boolean;
  reminders?: Date[];
}

/**
 * 处理决策接口
 */
export interface ProcessDecision {
  isActionable: boolean;
  actionType: ActionType;
  timeEstimate?: number;
  context?: string;
  priority?: Priority;
  notes?: string;
}

/**
 * 回顾数据接口
 */
export interface ReviewData {
  date: Date;
  completedActions: number;
  completedProjects: number;
  pendingActions: number;
  pendingProjects: number;
  waitingItems: number;
  notes?: string;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  type: 'action' | 'project' | 'waiting' | 'calendar' | 'inbox';
  item: Action | Project | WaitingItem | CalendarItem | InboxItem;
  matches: string[]; // 匹配的字段
  score: number; // 相关性评分
}

/**
 * 过滤条件接口
 */
export interface FilterCriteria {
  contexts?: string[];
  priorities?: Priority[];
  statuses?: ActionStatus[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
  searchText?: string;
}
