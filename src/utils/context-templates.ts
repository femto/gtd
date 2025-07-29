/**
 * 预设情境模板
 * 提供常用的GTD情境模板
 */

import type { Context } from '../types/interfaces';

/**
 * 情境模板接口
 */
export interface ContextTemplate {
  name: string;
  description: string;
  color: string;
  icon: string;
  category: 'work' | 'personal' | 'location' | 'tool' | 'energy';
}

/**
 * 预设情境模板
 */
export const CONTEXT_TEMPLATES: ContextTemplate[] = [
  // 工作相关情境
  {
    name: '办公室',
    description: '在办公室可以完成的任务',
    color: '#3B82F6', // blue-500
    icon: '🏢',
    category: 'work',
  },
  {
    name: '会议',
    description: '需要在会议中讨论或决定的事项',
    color: '#8B5CF6', // violet-500
    icon: '👥',
    category: 'work',
  },
  {
    name: '电话',
    description: '需要打电话处理的任务',
    color: '#10B981', // emerald-500
    icon: '📞',
    category: 'work',
  },
  {
    name: '电脑',
    description: '需要使用电脑完成的任务',
    color: '#6B7280', // gray-500
    icon: '💻',
    category: 'tool',
  },
  {
    name: '邮件',
    description: '需要发送或回复邮件的任务',
    color: '#F59E0B', // amber-500
    icon: '📧',
    category: 'tool',
  },

  // 个人生活情境
  {
    name: '家里',
    description: '在家中可以完成的任务',
    color: '#EF4444', // red-500
    icon: '🏠',
    category: 'personal',
  },
  {
    name: '外出',
    description: '外出时可以完成的任务',
    color: '#06B6D4', // cyan-500
    icon: '🚗',
    category: 'personal',
  },
  {
    name: '购物',
    description: '购物时需要完成的任务',
    color: '#84CC16', // lime-500
    icon: '🛒',
    category: 'personal',
  },

  // 地点相关情境
  {
    name: '银行',
    description: '需要在银行办理的事务',
    color: '#059669', // emerald-600
    icon: '🏦',
    category: 'location',
  },
  {
    name: '医院',
    description: '需要在医院处理的事项',
    color: '#DC2626', // red-600
    icon: '🏥',
    category: 'location',
  },
  {
    name: '图书馆',
    description: '需要在图书馆完成的学习任务',
    color: '#7C3AED', // violet-600
    icon: '📚',
    category: 'location',
  },

  // 能量水平情境
  {
    name: '高能量',
    description: '精力充沛时适合做的重要任务',
    color: '#F97316', // orange-500
    icon: '⚡',
    category: 'energy',
  },
  {
    name: '低能量',
    description: '疲劳时也能完成的简单任务',
    color: '#6B7280', // gray-500
    icon: '😴',
    category: 'energy',
  },
  {
    name: '创意',
    description: '需要创造性思维的任务',
    color: '#EC4899', // pink-500
    icon: '🎨',
    category: 'energy',
  },

  // 工具相关情境
  {
    name: '手机',
    description: '可以用手机完成的任务',
    color: '#14B8A6', // teal-500
    icon: '📱',
    category: 'tool',
  },
  {
    name: '网络',
    description: '需要网络连接的在线任务',
    color: '#3B82F6', // blue-500
    icon: '🌐',
    category: 'tool',
  },
  {
    name: '打印',
    description: '需要打印或扫描的任务',
    color: '#6B7280', // gray-500
    icon: '🖨️',
    category: 'tool',
  },
];

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(
  category: ContextTemplate['category']
): ContextTemplate[] {
  return CONTEXT_TEMPLATES.filter((template) => template.category === category);
}

/**
 * 获取所有分类
 */
export function getCategories(): ContextTemplate['category'][] {
  return ['work', 'personal', 'location', 'tool', 'energy'];
}

/**
 * 获取分类显示名称
 */
export function getCategoryDisplayName(
  category: ContextTemplate['category']
): string {
  const names = {
    work: '工作',
    personal: '个人',
    location: '地点',
    tool: '工具',
    energy: '能量',
  };
  return names[category];
}

/**
 * 将模板转换为情境对象
 */
export function templateToContext(
  template: ContextTemplate
): Omit<Context, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: template.name,
    description: template.description,
    color: template.color,
    icon: template.icon,
    isActive: true,
  };
}

/**
 * 获取推荐的默认情境
 */
export function getRecommendedContexts(): ContextTemplate[] {
  return [
    CONTEXT_TEMPLATES.find((t) => t.name === '办公室')!,
    CONTEXT_TEMPLATES.find((t) => t.name === '家里')!,
    CONTEXT_TEMPLATES.find((t) => t.name === '电脑')!,
    CONTEXT_TEMPLATES.find((t) => t.name === '电话')!,
    CONTEXT_TEMPLATES.find((t) => t.name === '外出')!,
    CONTEXT_TEMPLATES.find((t) => t.name === '高能量')!,
  ];
}
