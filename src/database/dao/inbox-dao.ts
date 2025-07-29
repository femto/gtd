/**
 * 工作篮数据访问对象
 * 提供工作篮项目的数据库操作
 */

import { BaseDAO } from './base-dao';
import type { InboxItem } from '../../types';
import { InputType } from '../../types';
import { db } from '../schema';

/**
 * 工作篮DAO类
 */
export class InboxDAO extends BaseDAO<InboxItem> {
  constructor() {
    super(db.inboxItems);
  }

  /**
   * 获取未处理的项目
   */
  async getUnprocessed(): Promise<InboxItem[]> {
    return await this.table.where('processed').equals(0).toArray();
  }

  /**
   * 获取已处理的项目
   */
  async getProcessed(): Promise<InboxItem[]> {
    return await this.table.where('processed').equals(1).toArray();
  }

  /**
   * 标记为已处理
   */
  async markAsProcessed(id: string): Promise<void> {
    await this.update(id, { processed: true });
  }

  /**
   * 标记为未处理
   */
  async markAsUnprocessed(id: string): Promise<void> {
    await this.update(id, { processed: false });
  }

  /**
   * 按类型获取项目
   */
  async getByType(type: InputType): Promise<InboxItem[]> {
    return await this.table.where('type').equals(type).toArray();
  }

  /**
   * 搜索项目内容
   */
  async searchByContent(searchTerm: string): Promise<InboxItem[]> {
    return await this.table
      .filter((item) =>
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .toArray();
  }

  /**
   * 获取未处理项目数量
   */
  async getUnprocessedCount(): Promise<number> {
    return await this.table.where('processed').equals(0).count();
  }

  /**
   * 获取已处理的项目
   */
  async getProcessedItems(): Promise<InboxItem[]> {
    return await this.table.where('processed').equals(1).toArray();
  }
}

// 导出单例实例
export const inboxDao = new InboxDAO();
