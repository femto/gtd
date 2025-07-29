/**
 * 行动数据访问对象
 * 处理行动相关的数据库操作
 */

import { BaseDAO } from './base-dao';
import { db } from '../schema';
import type { Action } from '../../types/interfaces';
import { ActionStatus, Priority } from '../../types/enums';

/**
 * 行动DAO类
 */
export class ActionDAO extends BaseDAO<Action> {
  constructor() {
    super(db.actions);
  }

  /**
   * 根据情境获取行动
   */
  async getByContext(contextId: string): Promise<Action[]> {
    return await this.table.where('contextId').equals(contextId).toArray();
  }

  /**
   * 根据项目获取行动
   */
  async getByProject(projectId: string): Promise<Action[]> {
    return await this.table.where('projectId').equals(projectId).toArray();
  }

  /**
   * 根据状态获取行动
   */
  async getByStatus(status: ActionStatus): Promise<Action[]> {
    return await this.table.where('status').equals(status).toArray();
  }

  /**
   * 获取下一步行动
   */
  async getNextActions(): Promise<Action[]> {
    return await this.getByStatus(ActionStatus.NEXT);
  }

  /**
   * 获取等待行动
   */
  async getWaitingActions(): Promise<Action[]> {
    return await this.getByStatus(ActionStatus.WAITING);
  }

  /**
   * 获取已安排行动
   */
  async getScheduledActions(): Promise<Action[]> {
    return await this.getByStatus(ActionStatus.SCHEDULED);
  }

  /**
   * 获取已完成行动
   */
  async getCompletedActions(): Promise<Action[]> {
    return await this.getByStatus(ActionStatus.COMPLETED);
  }

  /**
   * 根据优先级获取行动
   */
  async getByPriority(priority: Priority): Promise<Action[]> {
    return await this.table.where('priority').equals(priority).toArray();
  }

  /**
   * 获取今日到期的行动
   */
  async getTodayActions(): Promise<Action[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.table
      .where('dueDate')
      .between(today, tomorrow, false, true)
      .and((action) => action.status === ActionStatus.NEXT)
      .toArray();
  }

  /**
   * 获取过期的行动
   */
  async getOverdueActions(): Promise<Action[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.table
      .where('dueDate')
      .below(today)
      .and((action) => action.status === ActionStatus.NEXT)
      .toArray();
  }

  /**
   * 完成行动
   */
  async completeAction(id: string): Promise<void> {
    await this.update(id, {
      status: ActionStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * 搜索行动
   */
  async search(query: string): Promise<Action[]> {
    const lowerQuery = query.toLowerCase();
    return await this.table
      .filter((action) => {
        const titleMatch =
          action.title?.toLowerCase().includes(lowerQuery) || false;
        const descMatch =
          action.description?.toLowerCase().includes(lowerQuery) || false;
        const notesMatch =
          action.notes?.toLowerCase().includes(lowerQuery) || false;
        return titleMatch || descMatch || notesMatch;
      })
      .toArray();
  }

  /**
   * 获取行动统计信息
   */
  async getActionStats(): Promise<{
    total: number;
    next: number;
    waiting: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  }> {
    const [total, next, waiting, scheduled, completed, cancelled] =
      await Promise.all([
        this.count(),
        this.table.where('status').equals(ActionStatus.NEXT).count(),
        this.table.where('status').equals(ActionStatus.WAITING).count(),
        this.table.where('status').equals(ActionStatus.SCHEDULED).count(),
        this.table.where('status').equals(ActionStatus.COMPLETED).count(),
        this.table.where('status').equals(ActionStatus.CANCELLED).count(),
      ]);

    return { total, next, waiting, scheduled, completed, cancelled };
  }

  /**
   * 根据情境和状态获取行动
   */
  async getByContextAndStatus(
    contextId: string,
    status: ActionStatus
  ): Promise<Action[]> {
    return await this.table
      .where('contextId')
      .equals(contextId)
      .and((action) => action.status === status)
      .toArray();
  }

  /**
   * 根据项目和状态获取行动
   */
  async getByProjectAndStatus(
    projectId: string,
    status: ActionStatus
  ): Promise<Action[]> {
    return await this.table
      .where('projectId')
      .equals(projectId)
      .and((action) => action.status === status)
      .toArray();
  }

  /**
   * 获取项目的下一步行动
   */
  async getProjectNextActions(projectId: string): Promise<Action[]> {
    return await this.getByProjectAndStatus(projectId, ActionStatus.NEXT);
  }

  /**
   * 批量更新行动状态
   */
  async batchUpdateStatus(ids: string[], status: ActionStatus): Promise<void> {
    const updates: any = { status };

    if (status === ActionStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    await this.table.where('id').anyOf(ids).modify(updates);
  }

  /**
   * 根据标签搜索行动
   */
  async searchByTags(tags: string[]): Promise<Action[]> {
    return await this.table
      .filter((action) => {
        if (!action.tags || action.tags.length === 0) return false;
        return tags.some((tag) => action.tags!.includes(tag));
      })
      .toArray();
  }

  /**
   * 获取所有使用的标签
   */
  async getAllTags(): Promise<string[]> {
    const actions = await this.getAll();
    const tagSet = new Set<string>();

    actions.forEach((action) => {
      if (action.tags) {
        action.tags.forEach((tag) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  }
}

// 导出单例实例
export const actionDao = new ActionDAO();
