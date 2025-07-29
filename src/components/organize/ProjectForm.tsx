/**
 * 项目表单组件
 * 用于创建和编辑项目
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { Project } from '../../types/interfaces';
import { ProjectStatus } from '../../types/enums';

interface ProjectFormProps {
  project?: Project;
  onSave?: (project: Project) => void;
  onCancel?: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSave,
  onCancel,
}) => {
  const { addProject, updateProject, organizeError, clearOrganizeError } =
    useGTDStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: ProjectStatus.ACTIVE as ProjectStatus,
    notes: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        status: project.status,
        notes: project.notes || '',
        tags: project.tags || [],
      });
    }
  }, [project]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearOrganizeError();

    try {
      if (project) {
        // 更新现有项目
        await updateProject(project.id, formData);
        onSave?.({ ...project, ...formData, updatedAt: new Date() });
      } else {
        // 创建新项目
        await addProject(formData);
        onSave?.({
          ...formData,
          id: '', // 实际ID由store生成
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Project);
      }

      // 重置表单
      if (!project) {
        setFormData({
          title: '',
          description: '',
          status: ProjectStatus.ACTIVE,
          notes: '',
          tags: [],
        });
        setTagInput('');
      }
    } catch (error) {
      console.error('保存项目失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    {
      value: ProjectStatus.ACTIVE,
      label: '活跃',
      description: '正在进行的项目',
    },
    {
      value: ProjectStatus.ON_HOLD,
      label: '暂停',
      description: '暂时搁置的项目',
    },
    {
      value: ProjectStatus.COMPLETED,
      label: '已完成',
      description: '已经完成的项目',
    },
    {
      value: ProjectStatus.CANCELLED,
      label: '已取消',
      description: '已经取消的项目',
    },
  ];

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 标题 */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            项目标题 *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入项目标题"
            required
          />
        </div>

        {/* 描述 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            项目描述
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入项目描述（可选）"
          />
        </div>

        {/* 状态 */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            项目状态
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) =>
              handleInputChange('status', e.target.value as ProjectStatus)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>

          {/* 现有标签 */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 添加标签 */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入标签名称"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              添加
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            按回车键或点击"添加"按钮来添加标签
          </p>
        </div>

        {/* 备注 */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            备注
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入项目备注（可选）"
          />
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
            disabled={isSubmitting || !formData.title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '保存中...' : project ? '更新项目' : '创建项目'}
          </button>
        </div>
      </form>
    </div>
  );
};
