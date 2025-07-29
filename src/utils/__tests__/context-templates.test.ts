/**
 * 情境模板工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  CONTEXT_TEMPLATES,
  getTemplatesByCategory,
  getCategories,
  getCategoryDisplayName,
  templateToContext,
  getRecommendedContexts,
  type ContextTemplate,
} from '../context-templates';

describe('Context Templates', () => {
  describe('CONTEXT_TEMPLATES', () => {
    it('应该包含预设的情境模板', () => {
      expect(CONTEXT_TEMPLATES).toBeDefined();
      expect(CONTEXT_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('每个模板应该有必需的属性', () => {
      CONTEXT_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('color');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('category');

        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.color).toBe('string');
        expect(typeof template.icon).toBe('string');
        expect(['work', 'personal', 'location', 'tool', 'energy']).toContain(
          template.category
        );
      });
    });

    it('模板名称应该是唯一的', () => {
      const names = CONTEXT_TEMPLATES.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it('应该包含常用的情境模板', () => {
      const names = CONTEXT_TEMPLATES.map((t) => t.name);

      // 检查是否包含一些基本的情境
      expect(names).toContain('办公室');
      expect(names).toContain('家里');
      expect(names).toContain('电脑');
      expect(names).toContain('电话');
    });
  });

  describe('getTemplatesByCategory', () => {
    it('应该能够按分类获取模板', () => {
      const workTemplates = getTemplatesByCategory('work');
      const personalTemplates = getTemplatesByCategory('personal');
      const locationTemplates = getTemplatesByCategory('location');
      const toolTemplates = getTemplatesByCategory('tool');
      const energyTemplates = getTemplatesByCategory('energy');

      expect(workTemplates.length).toBeGreaterThan(0);
      expect(personalTemplates.length).toBeGreaterThan(0);
      expect(locationTemplates.length).toBeGreaterThan(0);
      expect(toolTemplates.length).toBeGreaterThan(0);
      expect(energyTemplates.length).toBeGreaterThan(0);

      // 验证分类正确
      workTemplates.forEach((t) => expect(t.category).toBe('work'));
      personalTemplates.forEach((t) => expect(t.category).toBe('personal'));
      locationTemplates.forEach((t) => expect(t.category).toBe('location'));
      toolTemplates.forEach((t) => expect(t.category).toBe('tool'));
      energyTemplates.forEach((t) => expect(t.category).toBe('energy'));
    });

    it('应该返回空数组对于不存在的分类', () => {
      const result = getTemplatesByCategory('nonexistent' as any);
      expect(result).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('应该返回所有可用的分类', () => {
      const categories = getCategories();

      expect(categories).toContain('work');
      expect(categories).toContain('personal');
      expect(categories).toContain('location');
      expect(categories).toContain('tool');
      expect(categories).toContain('energy');
      expect(categories.length).toBe(5);
    });
  });

  describe('getCategoryDisplayName', () => {
    it('应该返回正确的分类显示名称', () => {
      expect(getCategoryDisplayName('work')).toBe('工作');
      expect(getCategoryDisplayName('personal')).toBe('个人');
      expect(getCategoryDisplayName('location')).toBe('地点');
      expect(getCategoryDisplayName('tool')).toBe('工具');
      expect(getCategoryDisplayName('energy')).toBe('能量');
    });
  });

  describe('templateToContext', () => {
    it('应该将模板转换为情境对象', () => {
      const template: ContextTemplate = {
        name: '测试情境',
        description: '测试描述',
        color: '#3B82F6',
        icon: '🏢',
        category: 'work',
      };

      const context = templateToContext(template);

      expect(context.name).toBe(template.name);
      expect(context.description).toBe(template.description);
      expect(context.color).toBe(template.color);
      expect(context.icon).toBe(template.icon);
      expect(context.isActive).toBe(true);

      // 确保不包含模板特有的属性
      expect(context).not.toHaveProperty('category');
      expect(context).not.toHaveProperty('id');
      expect(context).not.toHaveProperty('createdAt');
      expect(context).not.toHaveProperty('updatedAt');
    });
  });

  describe('getRecommendedContexts', () => {
    it('应该返回推荐的默认情境', () => {
      const recommended = getRecommendedContexts();

      expect(recommended.length).toBe(6);

      const names = recommended.map((t) => t.name);
      expect(names).toContain('办公室');
      expect(names).toContain('家里');
      expect(names).toContain('电脑');
      expect(names).toContain('电话');
      expect(names).toContain('外出');
      expect(names).toContain('高能量');
    });

    it('推荐的情境应该都存在于模板中', () => {
      const recommended = getRecommendedContexts();
      const allTemplateNames = CONTEXT_TEMPLATES.map((t) => t.name);

      recommended.forEach((template) => {
        expect(allTemplateNames).toContain(template.name);
      });
    });
  });

  describe('模板数据完整性', () => {
    it('颜色值应该是有效的十六进制颜色', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      CONTEXT_TEMPLATES.forEach((template) => {
        expect(template.color).toMatch(hexColorRegex);
      });
    });

    it('图标应该是有效的emoji', () => {
      CONTEXT_TEMPLATES.forEach((template) => {
        expect(template.icon).toBeTruthy();
        expect(template.icon.length).toBeGreaterThan(0);
        // 简单检查是否包含emoji字符（这个检查不是完美的，但足够基本验证）
        expect(template.icon).toMatch(
          /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
        );
      });
    });

    it('名称和描述应该不为空', () => {
      CONTEXT_TEMPLATES.forEach((template) => {
        expect(template.name.trim()).toBeTruthy();
        expect(template.description.trim()).toBeTruthy();
      });
    });
  });

  describe('分类分布', () => {
    it('每个分类都应该有模板', () => {
      const categories = getCategories();

      categories.forEach((category) => {
        const templates = getTemplatesByCategory(category);
        expect(templates.length).toBeGreaterThan(0);
      });
    });

    it('模板分布应该相对均匀', () => {
      const categories = getCategories();
      const distribution = categories.map((category) => ({
        category,
        count: getTemplatesByCategory(category).length,
      }));

      // 每个分类至少应该有2个模板
      distribution.forEach(({ count }) => {
        expect(count).toBeGreaterThanOrEqual(2);
      });

      // 总数应该等于所有模板数
      const totalFromCategories = distribution.reduce(
        (sum, { count }) => sum + count,
        0
      );
      expect(totalFromCategories).toBe(CONTEXT_TEMPLATES.length);
    });
  });
});
