/**
 * 情境DAO单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { contextDao } from '../context-dao';
import { db } from '../../schema';
import type { Context } from '../../../types/interfaces';

describe('ContextDAO', () => {
  // 测试数据
  const mockContext: Omit<Context, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '测试情境',
    description: '这是一个测试情境',
    color: '#3B82F6',
    icon: '🏢',
    isActive: true,
  };

  const mockContext2: Omit<Context, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '测试情境2',
    description: '这是第二个测试情境',
    color: '#EF4444',
    icon: '🏠',
    isActive: false,
  };

  beforeEach(async () => {
    // 清空数据库
    await db.contexts.clear();
  });

  afterEach(async () => {
    // 清理数据库
    await db.contexts.clear();
  });

  describe('基础CRUD操作', () => {
    it('应该能够创建情境', async () => {
      const id = await contextDao.create(mockContext);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const created = await contextDao.getById(id);
      expect(created).toBeDefined();
      expect(created!.name).toBe(mockContext.name);
      expect(created!.description).toBe(mockContext.description);
      expect(created!.color).toBe(mockContext.color);
      expect(created!.icon).toBe(mockContext.icon);
      expect(created!.isActive).toBe(mockContext.isActive);
      expect(created!.createdAt).toBeInstanceOf(Date);
      expect(created!.updatedAt).toBeInstanceOf(Date);
    });

    it('应该能够根据ID获取情境', async () => {
      const id = await contextDao.create(mockContext);
      const context = await contextDao.getById(id);

      expect(context).toBeDefined();
      expect(context!.id).toBe(id);
      expect(context!.name).toBe(mockContext.name);
    });

    it('应该能够获取所有情境', async () => {
      const id1 = await contextDao.create(mockContext);
      const id2 = await contextDao.create(mockContext2);

      const contexts = await contextDao.getAll();

      expect(contexts).toHaveLength(2);
      expect(contexts.map((c) => c.id)).toContain(id1);
      expect(contexts.map((c) => c.id)).toContain(id2);
    });

    it('应该能够更新情境', async () => {
      const id = await contextDao.create(mockContext);

      const updates = {
        name: '更新后的情境',
        color: '#10B981',
        isActive: false,
      };

      await contextDao.update(id, updates);
      const updated = await contextDao.getById(id);

      expect(updated!.name).toBe(updates.name);
      expect(updated!.color).toBe(updates.color);
      expect(updated!.isActive).toBe(updates.isActive);
      expect(updated!.description).toBe(mockContext.description); // 未更新的字段保持不变
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(
        updated!.createdAt.getTime()
      );
    });

    it('应该能够删除情境', async () => {
      const id = await contextDao.create(mockContext);

      await contextDao.delete(id);
      const deleted = await contextDao.getById(id);

      expect(deleted).toBeUndefined();
    });

    it('应该能够统计情境数量', async () => {
      expect(await contextDao.count()).toBe(0);

      await contextDao.create(mockContext);
      expect(await contextDao.count()).toBe(1);

      await contextDao.create(mockContext2);
      expect(await contextDao.count()).toBe(2);
    });
  });

  describe('特定查询方法', () => {
    it('应该能够获取活跃情境', async () => {
      await contextDao.create(mockContext); // isActive: true
      await contextDao.create(mockContext2); // isActive: false

      const activeContexts = await contextDao.getActiveContexts();

      expect(activeContexts).toHaveLength(1);
      expect(activeContexts[0].name).toBe(mockContext.name);
      expect(activeContexts[0].isActive).toBe(true);
    });

    it('应该能够根据名称查找情境', async () => {
      const id = await contextDao.create(mockContext);

      const found = await contextDao.getByName(mockContext.name);
      expect(found).toBeDefined();
      expect(found!.id).toBe(id);

      const notFound = await contextDao.getByName('不存在的情境');
      expect(notFound).toBeUndefined();
    });

    it('应该能够检查名称是否存在', async () => {
      await contextDao.create(mockContext);

      const exists = await contextDao.isNameExists(mockContext.name);
      expect(exists).toBe(true);

      const notExists = await contextDao.isNameExists('不存在的情境');
      expect(notExists).toBe(false);
    });

    it('检查名称存在时应该排除指定ID', async () => {
      const id = await contextDao.create(mockContext);

      // 排除自己的ID，应该返回false
      const existsExcludingSelf = await contextDao.isNameExists(
        mockContext.name,
        id
      );
      expect(existsExcludingSelf).toBe(false);

      // 不排除ID，应该返回true
      const existsNotExcluding = await contextDao.isNameExists(
        mockContext.name
      );
      expect(existsNotExcluding).toBe(true);
    });
  });

  describe('状态管理方法', () => {
    it('应该能够激活情境', async () => {
      const id = await contextDao.create({ ...mockContext, isActive: false });

      await contextDao.activate(id);
      const activated = await contextDao.getById(id);

      expect(activated!.isActive).toBe(true);
    });

    it('应该能够停用情境', async () => {
      const id = await contextDao.create({ ...mockContext, isActive: true });

      await contextDao.deactivate(id);
      const deactivated = await contextDao.getById(id);

      expect(deactivated!.isActive).toBe(false);
    });

    it('应该能够批量激活情境', async () => {
      const id1 = await contextDao.create({ ...mockContext, isActive: false });
      const id2 = await contextDao.create({ ...mockContext2, isActive: false });

      await contextDao.activateMany([id1, id2]);

      const context1 = await contextDao.getById(id1);
      const context2 = await contextDao.getById(id2);

      expect(context1!.isActive).toBe(true);
      expect(context2!.isActive).toBe(true);
    });

    it('应该能够批量停用情境', async () => {
      const id1 = await contextDao.create({ ...mockContext, isActive: true });
      const id2 = await contextDao.create({ ...mockContext2, isActive: true });

      await contextDao.deactivateMany([id1, id2]);

      const context1 = await contextDao.getById(id1);
      const context2 = await contextDao.getById(id2);

      expect(context1!.isActive).toBe(false);
      expect(context2!.isActive).toBe(false);
    });
  });

  describe('统计和搜索方法', () => {
    it('应该能够获取情境统计信息', async () => {
      await contextDao.create({ ...mockContext, isActive: true });
      await contextDao.create({ ...mockContext2, isActive: false });

      const stats = await contextDao.getContextStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(1);
    });

    it('应该能够搜索情境', async () => {
      await contextDao.create({ ...mockContext, name: '办公室工作' });
      await contextDao.create({
        ...mockContext2,
        name: '家庭生活',
        description: '在家里完成的任务',
      });

      // 按名称搜索
      const searchByName = await contextDao.search('办公');
      expect(searchByName).toHaveLength(1);
      expect(searchByName[0].name).toBe('办公室工作');

      // 按描述搜索
      const searchByDescription = await contextDao.search('家里');
      expect(searchByDescription).toHaveLength(1);
      expect(searchByDescription[0].name).toBe('家庭生活');

      // 无匹配结果
      const noMatch = await contextDao.search('不存在');
      expect(noMatch).toHaveLength(0);
    });

    it('搜索应该不区分大小写', async () => {
      await contextDao.create({ ...mockContext, name: 'Office Work' });

      const searchLower = await contextDao.search('office');
      const searchUpper = await contextDao.search('OFFICE');
      const searchMixed = await contextDao.search('Office');

      expect(searchLower).toHaveLength(1);
      expect(searchUpper).toHaveLength(1);
      expect(searchMixed).toHaveLength(1);
    });
  });

  describe('批量操作', () => {
    it('应该能够批量删除情境', async () => {
      const id1 = await contextDao.create(mockContext);
      const id2 = await contextDao.create(mockContext2);

      await contextDao.deleteMany([id1, id2]);

      const context1 = await contextDao.getById(id1);
      const context2 = await contextDao.getById(id2);

      expect(context1).toBeUndefined();
      expect(context2).toBeUndefined();
    });

    it('应该能够清空所有情境', async () => {
      await contextDao.create(mockContext);
      await contextDao.create(mockContext2);

      expect(await contextDao.count()).toBe(2);

      await contextDao.clear();

      expect(await contextDao.count()).toBe(0);
    });
  });

  describe('分页查询', () => {
    it('应该能够分页获取情境', async () => {
      // 创建5个情境
      for (let i = 0; i < 5; i++) {
        await contextDao.create({
          ...mockContext,
          name: `情境${i + 1}`,
        });
      }

      // 获取前3个
      const firstPage = await contextDao.paginate(0, 3);
      expect(firstPage).toHaveLength(3);

      // 获取后2个
      const secondPage = await contextDao.paginate(3, 3);
      expect(secondPage).toHaveLength(2);
    });
  });
});
