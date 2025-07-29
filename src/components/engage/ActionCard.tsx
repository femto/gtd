/**
 * 任务卡片组件
 * 显示单个任务的详细信息和操作按钮
 */

import React, { useState } from 'react';
import type { Action } from '../../types/interfaces';
import { Priority } from '../../types/enums';

interface ActionCardProps {
  action: Action;
  contextName: string;
  contextColor: string;
  onComplete: () => void;
  onUpdate: (updates: Partial<Action>) => void;
  isOverdue?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  contextName,
  contextColor,
  onComplete,
  onUpdate,
  isOverdue = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(action.title);
  const [editDescription, setEditDescription] = useState(
    action.description || ''
  );
  const [editNotes, setEditNotes] = useState(action.notes || '');
  const [editProgress, setEditProgress] = useState(action.progress || 0);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case Priority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case Priority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return '紧急';
      case Priority.HIGH:
        return '高';
      case Priority.MEDIUM:
        return '中';
      case Priority.LOW:
        return '低';
      default:
        return '未知';
    }
  };

  const formatDueDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return '今天';
    } else if (date.getTime() === tomorrow.getTime()) {
      return '明天';
    } else if (date < today) {
      const diffDays = Math.ceil(
        (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `过期 ${diffDays} 天`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleSaveEdit = () => {
    onUpdate({
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      notes: editNotes.trim() || undefined,
      progress: editProgress,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(action.title);
    setEditDescription(action.description || '');
    setEditNotes(action.notes || '');
    setEditProgress(action.progress || 0);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        {/* 任务标题和主要信息 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full text-lg font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {action.title}
              </h3>
            )}

            {/* 情境和优先级标签 */}
            <div className="flex items-center space-x-2 mt-2">
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${contextColor}20`,
                  color: contextColor,
                  borderColor: `${contextColor}40`,
                }}
              >
                {contextName}
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(action.priority)}`}
              >
                {getPriorityLabel(action.priority)}
              </span>
              {action.estimatedTime && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  {action.estimatedTime}分钟
                </span>
              )}
              {action.dueDate && (
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isOverdue
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {formatDueDate(action.dueDate)}
                </span>
              )}
              {action.progress !== undefined && action.progress > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {action.progress}% 完成
                </span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2 ml-4">
            {!isEditing && (
              <>
                {/* 快速进度更新按钮 */}
                {(action.progress || 0) < 100 && (
                  <div className="flex items-center space-x-1 mr-2">
                    <button
                      onClick={() =>
                        onUpdate({
                          progress: Math.min((action.progress || 0) + 25, 100),
                        })
                      }
                      className="p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="增加25%进度"
                    >
                      +25%
                    </button>
                    <button
                      onClick={() =>
                        onUpdate({
                          progress: Math.max((action.progress || 0) - 25, 0),
                        })
                      }
                      className="p-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                      title="减少25%进度"
                    >
                      -25%
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  title="编辑任务"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  title={isExpanded ? '收起详情' : '展开详情'}
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={onComplete}
                  className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  完成
                </button>
              </>
            )}

            {isEditing && (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </>
            )}
          </div>
        </div>

        {/* 展开的详细信息 */}
        {(isExpanded || isEditing) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* 进度条 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  任务进度
                </label>
                <span className="text-sm text-gray-500">
                  {action.progress || 0}%
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${action.progress || 0}%` }}
                  />
                </div>
              )}
            </div>

            {/* 描述 */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="添加任务描述..."
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {action.description || '暂无描述'}
                </p>
              )}
            </div>

            {/* 备注 */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              {isEditing ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="添加备注..."
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {action.notes || '暂无备注'}
                </p>
              )}
            </div>

            {/* 标签 */}
            {action.tags && action.tags.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签
                </label>
                <div className="flex flex-wrap gap-1">
                  {action.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 创建和更新时间 */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>创建时间: {action.createdAt.toLocaleString('zh-CN')}</div>
              {action.updatedAt.getTime() !== action.createdAt.getTime() && (
                <div>更新时间: {action.updatedAt.toLocaleString('zh-CN')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
