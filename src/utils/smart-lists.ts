/**
 * 智能列表服务
 * 提供多维度过滤和保存的智能列表功能
 */

import type {
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  FilterCriteria,
} from '../types/interfaces';
import { ActionStatus, ProjectStatus, Priority } from '../types/enums';

/**
 * 智能列表定义
 */
export interface SmartList {
  id: string;
  name: string;
  description?: string;
  filters: FilterCriteria;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean; // 系统预设列表
}

/**
 * 过滤器选项
 */
export interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
  color?: string;
}

/**
 * 过滤器组
 */
export interface FilterGroup {
  id: string;
  label: string;
  type: 'single' | 'multiple' | 'range' | 'date';
  options: FilterOption[];
}

/**
 * 智能列表服务类
 */
export class SmartListService {
  private smartLists: SmartList[] = [];
  private readonly storageKey = 'gtd-smart-lists';

  constructor() {
    this.loadSmartLists();
    this.initializeSystemLists();
  }

  /**
   * 获取系统预设智能列表
   */
  private createSystemLists(): SmartList[] {
    const now = new Date();

    return [
      {
        id: 'today',
        name: '今日任务',
        description: '今天需要完成的所有任务',
        filters: {
          statuses: [ActionStatus.NEXT],
          dateRange: {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
        color: '#3B82F6',
        icon: 'calendar',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
      {
        id: 'high-priority',
        name: '高优先级',
        description: '所有高优先级和紧急任务',
        filters: {
          priorities: [Priority.HIGH, Priority.URGENT],
          statuses: [ActionStatus.NEXT],
        },
        color: '#EF4444',
        icon: 'exclamation',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
      {
        id: 'overdue',
        name: '过期任务',
        description: '已过期但未完成的任务',
        filters: {
          statuses: [ActionStatus.NEXT],
          dateRange: {
            end: now,
          },
        },
        color: '#F59E0B',
        icon: 'clock',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
      {
        id: 'waiting',
        name: '等待中',
        description: '等待他人回复或处理的项目',
        filters: {
          statuses: [ActionStatus.WAITING],
        },
        color: '#8B5CF6',
        icon: 'clock',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
      {
        id: 'no-context',
        name: '无情境任务',
        description: '没有指定情境的任务',
        filters: {
          statuses: [ActionStatus.NEXT],
          contexts: [], // 空数组表示没有情境
        },
        color: '#6B7280',
        icon: 'question',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
      {
        id: 'completed-today',
        name: '今日完成',
        description: '今天完成的任务',
        filters: {
          statuses: [ActionStatus.COMPLETED],
          dateRange: {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
        color: '#10B981',
        icon: 'check',
        createdAt: now,
        updatedAt: now,
        isSystem: true,
      },
    ];
  }

  /**
   * 初始化系统列表
   */
  private initializeSystemLists() {
    const systemLists = this.createSystemLists();

    // 更新或添加系统列表
    systemLists.forEach((systemList) => {
      const existingIndex = this.smartLists.findIndex(
        (list) => list.id === systemList.id
      );
      if (existingIndex >= 0) {
        // 更新现有系统列表，但保留用户可能的自定义
        this.smartLists[existingIndex] = {
          ...systemList,
          ...this.smartLists[existingIndex],
          isSystem: true,
        };
      } else {
        this.smartLists.unshift(systemList);
      }
    });
  }

  /**
   * 应用过滤器到数据
   */
  applyFilters(
    data: {
      actions: Action[];
      projects: Project[];
      waitingItems: WaitingItem[];
      calendarItems: CalendarItem[];
    },
    filters: FilterCriteria
  ): {
    actions: Action[];
    projects: Project[];
    waitingItems: WaitingItem[];
    calendarItems: CalendarItem[];
  } {
    const filteredActions = this.filterActions(data.actions, filters);
    const filteredProjects = this.filterProjects(data.projects, filters);
    const filteredWaiting = this.filterWaitingItems(data.waitingItems, filters);
    const filteredCalendar = this.filterCalendarItems(
      data.calendarItems,
      filters
    );

    return {
      actions: filteredActions,
      projects: filteredProjects,
      waitingItems: filteredWaiting,
      calendarItems: filteredCalendar,
    };
  }

  /**
   * 过滤行动
   */
  private filterActions(actions: Action[], filters: FilterCriteria): Action[] {
    return actions.filter((action) => {
      // 上下文过滤
      if (filters.contexts && filters.contexts.length > 0) {
        if (!filters.contexts.includes(action.contextId)) {
          return false;
        }
      }

      // 优先级过滤
      if (filters.priorities && filters.priorities.length > 0) {
        if (!filters.priorities.includes(action.priority)) {
          return false;
        }
      }

      // 状态过滤
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(action.status)) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;

        if (start && action.dueDate && action.dueDate < start) {
          return false;
        }

        if (end && action.dueDate && action.dueDate > end) {
          return false;
        }

        // 对于完成日期的过滤
        if (action.status === ActionStatus.COMPLETED && action.completedAt) {
          if (start && action.completedAt < start) {
            return false;
          }
          if (end && action.completedAt > end) {
            return false;
          }
        }
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const actionTags = action.tags || [];
        if (!filters.tags.some((tag) => actionTags.includes(tag))) {
          return false;
        }
      }

      // 搜索文本过滤
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const searchableText = [
          action.title,
          action.description,
          action.notes,
          ...(action.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 过滤项目
   */
  private filterProjects(
    projects: Project[],
    filters: FilterCriteria
  ): Project[] {
    return projects.filter((project) => {
      // 状态过滤（项目状态映射）
      if (filters.statuses && filters.statuses.length > 0) {
        const projectStatusMap: Record<ProjectStatus, ActionStatus[]> = {
          [ProjectStatus.ACTIVE]: [ActionStatus.NEXT],
          [ProjectStatus.ON_HOLD]: [ActionStatus.WAITING],
          [ProjectStatus.COMPLETED]: [ActionStatus.COMPLETED],
          [ProjectStatus.CANCELLED]: [ActionStatus.CANCELLED],
        };

        const mappedStatuses = projectStatusMap[project.status] || [];
        if (
          !filters.statuses.some((status) => mappedStatuses.includes(status))
        ) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;

        if (start && project.createdAt < start) {
          return false;
        }

        if (end && project.createdAt > end) {
          return false;
        }

        // 完成日期过滤
        if (project.status === ProjectStatus.COMPLETED && project.completedAt) {
          if (start && project.completedAt < start) {
            return false;
          }
          if (end && project.completedAt > end) {
            return false;
          }
        }
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const projectTags = project.tags || [];
        if (!filters.tags.some((tag) => projectTags.includes(tag))) {
          return false;
        }
      }

      // 搜索文本过滤
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const searchableText = [
          project.title,
          project.description,
          project.notes,
          ...(project.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 过滤等待项目
   */
  private filterWaitingItems(
    waitingItems: WaitingItem[],
    filters: FilterCriteria
  ): WaitingItem[] {
    return waitingItems.filter((item) => {
      // 日期范围过滤
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;

        if (start && item.createdAt < start) {
          return false;
        }

        if (end && item.createdAt > end) {
          return false;
        }

        // 跟进日期过滤
        if (item.followUpDate) {
          if (start && item.followUpDate < start) {
            return false;
          }
          if (end && item.followUpDate > end) {
            return false;
          }
        }
      }

      // 搜索文本过滤
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const searchableText = [
          item.title,
          item.description,
          item.waitingFor,
          item.notes,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 过滤日程项目
   */
  private filterCalendarItems(
    calendarItems: CalendarItem[],
    filters: FilterCriteria
  ): CalendarItem[] {
    return calendarItems.filter((item) => {
      // 日期范围过滤
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;

        if (start && item.startTime < start) {
          return false;
        }

        if (end && item.startTime > end) {
          return false;
        }
      }

      // 搜索文本过滤
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const searchableText = [item.title, item.description, item.location]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 生成过滤器选项
   */
  generateFilterOptions(data: {
    actions: Action[];
    contexts: { id: string; name: string; color: string }[];
  }): FilterGroup[] {
    const { actions, contexts } = data;

    // 统计各种选项的数量
    const contextCounts = new Map<string, number>();
    const priorityCounts = new Map<Priority, number>();
    const statusCounts = new Map<ActionStatus, number>();
    const tagCounts = new Map<string, number>();

    actions.forEach((action) => {
      // 统计上下文
      contextCounts.set(
        action.contextId,
        (contextCounts.get(action.contextId) || 0) + 1
      );

      // 统计优先级
      priorityCounts.set(
        action.priority,
        (priorityCounts.get(action.priority) || 0) + 1
      );

      // 统计状态
      statusCounts.set(
        action.status,
        (statusCounts.get(action.status) || 0) + 1
      );

      // 统计标签
      (action.tags || []).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return [
      {
        id: 'contexts',
        label: '情境',
        type: 'multiple',
        options: contexts.map((context) => ({
          id: context.id,
          label: context.name,
          value: context.id,
          count: contextCounts.get(context.id) || 0,
          color: context.color,
        })),
      },
      {
        id: 'priorities',
        label: '优先级',
        type: 'multiple',
        options: Object.values(Priority).map((priority) => ({
          id: priority,
          label: this.getPriorityLabel(priority),
          value: priority,
          count: priorityCounts.get(priority) || 0,
          color: this.getPriorityColor(priority),
        })),
      },
      {
        id: 'statuses',
        label: '状态',
        type: 'multiple',
        options: Object.values(ActionStatus).map((status) => ({
          id: status,
          label: this.getStatusLabel(status),
          value: status,
          count: statusCounts.get(status) || 0,
          color: this.getStatusColor(status),
        })),
      },
      {
        id: 'tags',
        label: '标签',
        type: 'multiple',
        options: Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1]) // 按使用频率排序
          .slice(0, 20) // 只显示前20个最常用的标签
          .map(([tag, count]) => ({
            id: tag,
            label: tag,
            value: tag,
            count,
          })),
      },
      {
        id: 'dateRange',
        label: '日期范围',
        type: 'date',
        options: [
          { id: 'today', label: '今天', value: 'today' },
          { id: 'tomorrow', label: '明天', value: 'tomorrow' },
          { id: 'this-week', label: '本周', value: 'this-week' },
          { id: 'next-week', label: '下周', value: 'next-week' },
          { id: 'this-month', label: '本月', value: 'this-month' },
          { id: 'custom', label: '自定义', value: 'custom' },
        ],
      },
    ];
  }

  /**
   * 获取优先级标签
   */
  private getPriorityLabel(priority: Priority): string {
    const labels: Record<Priority, string> = {
      [Priority.LOW]: '低',
      [Priority.MEDIUM]: '中',
      [Priority.HIGH]: '高',
      [Priority.URGENT]: '紧急',
    };
    return labels[priority] || priority;
  }

  /**
   * 获取优先级颜色
   */
  private getPriorityColor(priority: Priority): string {
    const colors: Record<Priority, string> = {
      [Priority.LOW]: '#10B981',
      [Priority.MEDIUM]: '#F59E0B',
      [Priority.HIGH]: '#EF4444',
      [Priority.URGENT]: '#DC2626',
    };
    return colors[priority] || '#6B7280';
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: ActionStatus): string {
    const labels: Record<ActionStatus, string> = {
      [ActionStatus.NEXT]: '下一步',
      [ActionStatus.WAITING]: '等待中',
      [ActionStatus.SCHEDULED]: '已安排',
      [ActionStatus.COMPLETED]: '已完成',
      [ActionStatus.CANCELLED]: '已取消',
    };
    return labels[status] || status;
  }

  /**
   * 获取状态颜色
   */
  private getStatusColor(status: ActionStatus): string {
    const colors: Record<ActionStatus, string> = {
      [ActionStatus.NEXT]: '#3B82F6',
      [ActionStatus.WAITING]: '#F59E0B',
      [ActionStatus.SCHEDULED]: '#8B5CF6',
      [ActionStatus.COMPLETED]: '#10B981',
      [ActionStatus.CANCELLED]: '#6B7280',
    };
    return colors[status] || '#6B7280';
  }

  /**
   * 获取所有智能列表
   */
  getSmartLists(): SmartList[] {
    return [...this.smartLists];
  }

  /**
   * 获取系统智能列表
   */
  getSystemLists(): SmartList[] {
    return this.smartLists.filter((list) => list.isSystem);
  }

  /**
   * 获取用户自定义智能列表
   */
  getUserLists(): SmartList[] {
    return this.smartLists.filter((list) => !list.isSystem);
  }

  /**
   * 根据ID获取智能列表
   */
  getSmartListById(id: string): SmartList | undefined {
    return this.smartLists.find((list) => list.id === id);
  }

  /**
   * 创建智能列表
   */
  createSmartList(
    data: Omit<SmartList, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>
  ): SmartList {
    const now = new Date();
    const smartList: SmartList = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      isSystem: false,
    };

    this.smartLists.push(smartList);
    this.saveSmartLists();

    return smartList;
  }

  /**
   * 更新智能列表
   */
  updateSmartList(
    id: string,
    updates: Partial<Omit<SmartList, 'id' | 'createdAt' | 'isSystem'>>
  ): SmartList | null {
    const index = this.smartLists.findIndex((list) => list.id === id);
    if (index === -1) {
      return null;
    }

    // 不允许修改系统列表
    if (this.smartLists[index].isSystem) {
      return null;
    }

    this.smartLists[index] = {
      ...this.smartLists[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveSmartLists();
    return this.smartLists[index];
  }

  /**
   * 删除智能列表
   */
  deleteSmartList(id: string): boolean {
    const index = this.smartLists.findIndex((list) => list.id === id);
    if (index === -1) {
      return false;
    }

    // 不允许删除系统列表
    if (this.smartLists[index].isSystem) {
      return false;
    }

    this.smartLists.splice(index, 1);
    this.saveSmartLists();
    return true;
  }

  /**
   * 复制智能列表
   */
  duplicateSmartList(id: string, name?: string): SmartList | null {
    const original = this.getSmartListById(id);
    if (!original) {
      return null;
    }

    return this.createSmartList({
      name: name || `${original.name} (副本)`,
      description: original.description,
      filters: { ...original.filters },
      color: original.color,
      icon: original.icon,
    });
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 保存智能列表到本地存储
   */
  private saveSmartLists() {
    try {
      const userLists = this.getUserLists();
      localStorage.setItem(this.storageKey, JSON.stringify(userLists));
    } catch (error) {
      console.warn('Failed to save smart lists:', error);
    }
  }

  /**
   * 从本地存储加载智能列表
   */
  private loadSmartLists() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const userLists = JSON.parse(stored).map((list: any) => ({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt),
        }));
        this.smartLists = userLists;
      }
    } catch (error) {
      console.warn('Failed to load smart lists:', error);
      this.smartLists = [];
    }
  }
}

// 导出单例实例
export const smartListService = new SmartListService();
