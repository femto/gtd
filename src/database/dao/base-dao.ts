/**
 * 基础DAO类
 * 提供通用的CRUD操作
 */

import type { Table } from 'dexie';
import type { BaseEntity } from '../../types';

/**
 * 基础DAO抽象类
 */
export abstract class BaseDAO<T extends BaseEntity> {
  protected table: Table<T>;

  constructor(table: Table<T>) {
    this.table = table;
  }

  /**
   * 创建新记录
   */
  async create(
    item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const id = await this.table.add(item as T);
    return id.toString();
  }

  /**
   * 根据ID获取记录
   */
  async getById(id: string): Promise<T | undefined> {
    return await this.table.get(id);
  }

  /**
   * 获取所有记录
   */
  async getAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  /**
   * 更新记录
   */
  async update(
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<void> {
    await this.table.update(id, {
      ...updates,
      updatedAt: new Date(),
    } as any);
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  /**
   * 批量删除
   */
  async deleteMany(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids);
  }

  /**
   * 获取记录数量
   */
  async count(): Promise<number> {
    return await this.table.count();
  }

  /**
   * 清空表
   */
  async clear(): Promise<void> {
    await this.table.clear();
  }

  /**
   * 分页查询
   */
  async paginate(offset: number, limit: number): Promise<T[]> {
    return await this.table.offset(offset).limit(limit).toArray();
  }
}
