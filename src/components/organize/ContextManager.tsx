/**
 * 情境管理器组件
 * 整合情境列表和表单的主要管理界面
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import { ContextList } from './ContextList';
import { ContextForm } from './ContextForm';
import type { Context } from '../../types/interfaces';
import {
  getRecommendedContexts,
  templateToContext,
} from '../../utils/context-templates';

export const ContextManager: React.FC = () => {
  const { contexts, loadAllData, addContext, isLoading, organizeError } =
    useGTDStore();

  const [showForm, setShowForm] = useState(false);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      if (!hasInitialized) {
        try {
          await loadAllData();
          setHasInitialized(true);
        } catch (error) {
          console.error('加载数据失败:', error);
        }
      }
    };

    initializeData();
  }, [loadAllData, hasInitialized]);

  const handleCreateContext = () => {
    setEditingContext(null);
    setShowForm(true);
  };

  const handleEditContext = (context: Context) => {
    setEditingContext(context);
    setShowForm(true);
  };

  const handleFormSave = (_context: Context) => {
    setShowForm(false);
    setEditingContext(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingContext(null);
  };

  const handleInitializeWithDefaults = async () => {
    try {
      const recommended = getRecommendedContexts();

      for (const template of recommended) {
        const contextData = templateToContext(template);
        await addContext(contextData);
      }
    } catch (error) {
      console.error('初始化默认情境失败:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">情境管理</h1>
            <p className="text-gray-600 mt-1">
              管理您的GTD情境，按不同场景组织任务
            </p>
          </div>
          <button
            onClick={handleCreateContext}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新建情境
          </button>
        </div>
      </div>

      {organizeError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">操作失败</h3>
              <p className="text-sm text-red-700 mt-1">{organizeError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 情境列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              情境列表 ({contexts.length})
            </h2>
            {contexts.length === 0 && (
              <button
                onClick={handleInitializeWithDefaults}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                使用推荐情境
              </button>
            )}
          </div>

          {contexts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无情境
              </h3>
              <p className="text-gray-600 mb-4">
                创建您的第一个情境来开始组织任务
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleCreateContext}
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建新情境
                </button>
                <button
                  onClick={handleInitializeWithDefaults}
                  className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  使用推荐情境
                </button>
              </div>
            </div>
          ) : (
            <ContextList onEditContext={handleEditContext} showActions={true} />
          )}
        </div>

        {/* 情境表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingContext ? '编辑情境' : '创建情境'}
          </h2>

          {showForm ? (
            <ContextForm
              context={editingContext || undefined}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
              showTemplates={!editingContext}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">✏️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                选择操作
              </h3>
              <p className="text-gray-600 mb-4">
                点击"新建情境"创建情境，或选择现有情境进行编辑
              </p>
              <button
                onClick={handleCreateContext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建新情境
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      {contexts.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">统计信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {contexts.length}
              </div>
              <div className="text-gray-600">总情境数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {contexts.filter((c) => c.isActive).length}
              </div>
              <div className="text-gray-600">活跃情境</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {contexts.filter((c) => !c.isActive).length}
              </div>
              <div className="text-gray-600">非活跃情境</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  (contexts.filter((c) => c.isActive).length /
                    contexts.length) *
                    100
                )}
                %
              </div>
              <div className="text-gray-600">活跃率</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
