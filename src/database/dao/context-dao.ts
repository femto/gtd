/**
 * 情境数据访问对象
 * 处理情境相关的数据库操作
 */

import { BaseDAO } from './base-dao';
import { db } from '../schema';
import type { Context } from '../../types/interfaces';

/**
 * 情境DAO类
 */
export class ContextDAO extends BaseDAO<Context> {
  constructor() {
    super(db.contexts);
  }

  /**
   * 获取所有活跃的情境
   */
  async getActiveContexts(): Promise<Context[]> {
    return await this.table.where('isActive').equals(1).toArray();
  }

  /**
   * 根据名称查找情境
   */
  async getByName(name: string): Promise<Context | undefined> {
    return await this.table.where('name').equals(name).first();
  }

  /**
   * 检查情境名称是否已存在
   */
  async isNameExists(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.getByName(name);
    return existing !== undefined && existing.id !== excludeId;
  }

  /**
   * 激活情境
   */
  async activate(id: string): Promise<void> {
    await this.update(id, { isActive: true });
  }

  /**
   * 停用情境
   */
  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  /**
   * 批量激活情境
   */
  async activateMany(ids: string[]): Promise<void> {
    await this.table.where('id').anyOf(ids).modify({ isActive: true });
  }

  /**
   * 批量停用情境
   */
  async deactivateMany(ids: string[]): Promise<void> {
    await this.table.where('id').anyOf(ids).modify({ isActive: false });
  }

  /**
   * 获取情境统计信息
   */
  async getContextStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const total = await this.count();
    const active = await this.table.where('isActive').equals(1).count();
    const inactive = total - active;

    return { total, active, inactive };
  }

  /**
   * 搜索情境
   */
  async search(query: string): Promise<Context[]> {
    const lowerQuery = query.toLowerCase();
    return await this.table
      .filter((context) => {
        const nameMatch =
          context.name?.toLowerCase().includes(lowerQuery) || false;
        const descMatch =
          context.description?.toLowerCase().includes(lowerQuery) || false;
        return nameMatch || descMatch;
      })
      .toArray();
  }
}

// 导出单例实例
export const contextDao = new ContextDAO();
