/**
 * 情境表单组件
 * 用于创建和编辑情境
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { Context } from '../../types/interfaces';
import {
  getTemplatesByCategory,
  getCategories,
  getCategoryDisplayName,
  templateToContext,
  type ContextTemplate,
} from '../../utils/context-templates';

interface ContextFormProps {
  context?: Context;
  onSave?: (context: Context) => void;
  onCancel?: () => void;
  showTemplates?: boolean;
}

const PRESET_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#F59E0B', // amber-500
  '#84CC16', // lime-500
  '#10B981', // emerald-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500
];

const PRESET_ICONS = [
  '🏢',
  '🏠',
  '💻',
  '📞',
  '📧',
  '🚗',
  '🛒',
  '🏦',
  '🏥',
  '📚',
  '⚡',
  '😴',
  '🎨',
  '📱',
  '🌐',
  '🖨️',
  '✏️',
  '📝',
  '📊',
  '🎯',
];

export const ContextForm: React.FC<ContextFormProps> = ({
  context,
  onSave,
  onCancel,
  showTemplates = true,
}) => {
  const { addContext, updateContext, organizeError, clearOrganizeError } =
    useGTDStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    icon: '',
    isActive: true,
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ContextTemplate | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<ContextTemplate['category']>('work');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (context) {
      setFormData({
        name: context.name,
        description: context.description || '',
        color: context.color,
        icon: context.icon || '',
        isActive: context.isActive,
      });
    }
  }, [context]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSelectedTemplate(null); // 清除模板选择
  };

  const handleTemplateSelect = (template: ContextTemplate) => {
    const contextData = templateToContext(template);
    setFormData((prev) => ({
      ...prev,
      ...contextData,
    }));
    setSelectedTemplate(template);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearOrganizeError();

    try {
      if (context) {
        // 更新现有情境
        await updateContext(context.id, formData);
        onSave?.({ ...context, ...formData, updatedAt: new Date() });
      } else {
        // 创建新情境
        await addContext(formData);
        onSave?.({
          ...formData,
          id: '', // 实际ID由store生成
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Context);
      }

      // 重置表单
      if (!context) {
        setFormData({
          name: '',
          description: '',
          color: PRESET_COLORS[0],
          icon: '',
          isActive: true,
        });
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('保存情境失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = getCategories();
  const currentCategoryTemplates = getTemplatesByCategory(activeCategory);

  return (
    <div className="space-y-6">
      {organizeError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{organizeError}</p>
            </div>
          </div>
        </div>
      )}

      {/* 模板选择 */}
      {showTemplates && !context && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">选择模板</h3>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  px-3 py-1 text-xs rounded-full transition-colors
                  ${
                    activeCategory === category
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }
                `}
              >
                {getCategoryDisplayName(category)}
              </button>
            ))}
          </div>

          {/* 模板列表 */}
          <div className="grid grid-cols-2 gap-2">
            {currentCategoryTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => handleTemplateSelect(template)}
                className={`
                  flex items-center space-x-2 p-2 rounded border text-left transition-colors
                  ${
                    selectedTemplate?.name === template.name
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                `}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: template.color }}
                />
                <span className="text-sm">{template.icon}</span>
                <span className="text-sm font-medium truncate">
                  {template.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名称 */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            名称 *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入情境名称"
            required
          />
        </div>

        {/* 描述 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            描述
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入情境描述（可选）"
          />
        </div>

        {/* 颜色和图标 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 颜色选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              颜色
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center space-x-2 w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-sm">{formData.color}</span>
              </button>

              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          handleInputChange('color', color);
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 图标选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              图标
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span className="text-lg">{formData.icon || '选择图标'}</span>
              </button>

              {showIconPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          handleInputChange('icon', icon);
                          setShowIconPicker(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-lg">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 状态 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isActive"
            className="ml-2 block text-sm text-gray-900"
          >
            激活状态
          </label>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '保存中...' : context ? '更新' : '创建'}
          </button>
        </div>
      </form>
    </div>
  );
};
