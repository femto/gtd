/**
 * 默认数据初始化工具
 * 为GTD系统创建默认的情境和其他基础数据
 */

import type { Context } from '../types/interfaces';
// import { generateId } from './validation';

/**
 * 创建默认情境
 */
export const createDefaultContexts = (): Omit<
  Context,
  'id' | 'createdAt' | 'updatedAt'
>[] => {
  return [
    {
      name: '办公室',
      description: '在办公室或工作场所可以完成的任务',
      color: '#3B82F6',
      icon: '🏢',
      isActive: true,
    },
    {
      name: '家里',
      description: '在家中可以完成的任务',
      color: '#10B981',
      icon: '🏠',
      isActive: true,
    },
    {
      name: '电脑',
      description: '需要使用电脑完成的任务',
      color: '#8B5CF6',
      icon: '💻',
      isActive: true,
    },
    {
      name: '电话',
      description: '需要打电话或通话的任务',
      color: '#F59E0B',
      icon: '📞',
      isActive: true,
    },
    {
      name: '外出',
      description: '需要外出才能完成的任务',
      color: '#EF4444',
      icon: '🚗',
      isActive: true,
    },
    {
      name: '购物',
      description: '购买物品相关的任务',
      color: '#06B6D4',
      icon: '🛒',
      isActive: true,
    },
    {
      name: '阅读',
      description: '阅读和学习相关的任务',
      color: '#84CC16',
      icon: '📚',
      isActive: true,
    },
  ];
};

/**
 * 检查是否需要初始化默认数据
 */
export const shouldInitializeDefaults = (contexts: Context[]): boolean => {
  return contexts.length === 0;
};
