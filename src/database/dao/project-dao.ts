/**
 * 项目数据访问对象
 * 处理项目相关的数据库操作
 */

import { BaseDAO } from './base-dao';
import { db } from '../schema';
import type { Project } from '../../types/interfaces';
import { ProjectStatus } from '../../types/enums';

/**
 * 项目DAO类
 */
export class ProjectDAO extends BaseDAO<Project> {
  constructor() {
    super(db.projects);
  }

  /**
   * 根据状态获取项目
   */
  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    return await this.table.where('status').equals(status).toArray();
  }

  /**
   * 获取活跃项目
   */
  async getActiveProjects(): Promise<Project[]> {
    return await this.getByStatus(ProjectStatus.ACTIVE);
  }

  /**
   * 获取已完成项目
   */
  async getCompletedProjects(): Promise<Project[]> {
    return await this.getByStatus(ProjectStatus.COMPLETED);
  }

  /**
   * 获取暂停项目
   */
  async getOnHoldProjects(): Promise<Project[]> {
    return await this.getByStatus(ProjectStatus.ON_HOLD);
  }

  /**
   * 获取已取消项目
   */
  async getCancelledProjects(): Promise<Project[]> {
    return await this.getByStatus(ProjectStatus.CANCELLED);
  }

  /**
   * 根据标题搜索项目
   */
  async searchByTitle(query: string): Promise<Project[]> {
    const lowerQuery = query.toLowerCase();
    return await this.table
      .filter((project) => {
        const titleMatch =
          project.title?.toLowerCase().includes(lowerQuery) || false;
        const descMatch =
          project.description?.toLowerCase().includes(lowerQuery) || false;
        return titleMatch || descMatch;
      })
      .toArray();
  }

  /**
   * 完成项目
   */
  async completeProject(id: string): Promise<void> {
    await this.update(id, {
      status: ProjectStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * 暂停项目
   */
  async pauseProject(id: string): Promise<void> {
    await this.update(id, {
      status: ProjectStatus.ON_HOLD,
    });
  }

  /**
   * 恢复项目
   */
  async resumeProject(id: string): Promise<void> {
    await this.update(id, {
      status: ProjectStatus.ACTIVE,
    });
  }

  /**
   * 取消项目
   */
  async cancelProject(id: string): Promise<void> {
    await this.update(id, {
      status: ProjectStatus.CANCELLED,
    });
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    cancelled: number;
  }> {
    const [total, active, completed, onHold, cancelled] = await Promise.all([
      this.count(),
      this.table.where('status').equals(ProjectStatus.ACTIVE).count(),
      this.table.where('status').equals(ProjectStatus.COMPLETED).count(),
      this.table.where('status').equals(ProjectStatus.ON_HOLD).count(),
      this.table.where('status').equals(ProjectStatus.CANCELLED).count(),
    ]);

    return { total, active, completed, onHold, cancelled };
  }

  /**
   * 获取最近更新的项目
   */
  async getRecentlyUpdated(limit: number = 10): Promise<Project[]> {
    return await this.table
      .orderBy('updatedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * 获取最近完成的项目
   */
  async getRecentlyCompleted(limit: number = 10): Promise<Project[]> {
    return await this.table
      .where('status')
      .equals(ProjectStatus.COMPLETED)
      .and((project) => project.completedAt !== undefined)
      .reverse()
      .sortBy('completedAt')
      .then((projects) => projects.slice(0, limit));
  }

  /**
   * 根据标签搜索项目
   */
  async searchByTags(tags: string[]): Promise<Project[]> {
    return await this.table
      .filter((project) => {
        if (!project.tags || project.tags.length === 0) return false;
        return tags.some((tag) => project.tags!.includes(tag));
      })
      .toArray();
  }

  /**
   * 获取所有使用的标签
   */
  async getAllTags(): Promise<string[]> {
    const projects = await this.getAll();
    const tagSet = new Set<string>();

    projects.forEach((project) => {
      if (project.tags) {
        project.tags.forEach((tag) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  }

  /**
   * 批量更新项目状态
   */
  async batchUpdateStatus(ids: string[], status: ProjectStatus): Promise<void> {
    const updates: any = { status };

    if (status === ProjectStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    await this.table.where('id').anyOf(ids).modify(updates);
  }
}

// 导出单例实例
export const projectDao = new ProjectDAO();
