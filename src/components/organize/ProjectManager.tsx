/**
 * 项目管理器组件
 * 整合项目列表和表单的主要管理界面
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import { ProjectList } from './ProjectList';
import { ProjectForm } from './ProjectForm';
import type { Project } from '../../types/interfaces';
import { ProjectStatus } from '../../types/enums';

export const ProjectManager: React.FC = () => {
  const { projects, actions, loadAllData, isLoading, organizeError } =
    useGTDStore();

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleFormSave = (_project: Project) => {
    setShowForm(false);
    setEditingProject(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const getProjectStats = () => {
    const total = projects.length;
    const active = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE
    ).length;
    const completed = projects.filter(
      (p) => p.status === ProjectStatus.COMPLETED
    ).length;
    const onHold = projects.filter(
      (p) => p.status === ProjectStatus.ON_HOLD
    ).length;
    const cancelled = projects.filter(
      (p) => p.status === ProjectStatus.CANCELLED
    ).length;

    return { total, active, completed, onHold, cancelled };
  };

  const getProjectActionStats = () => {
    const projectActions = new Map<string, number>();
    actions.forEach((action) => {
      if (action.projectId) {
        projectActions.set(
          action.projectId,
          (projectActions.get(action.projectId) || 0) + 1
        );
      }
    });
    return projectActions;
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

  const stats = getProjectStats();
  const projectActionStats = getProjectActionStats();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-1">
              管理您的GTD项目，跟踪项目进展和相关行动
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新建项目
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

      {/* 统计信息 */}
      {projects.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">项目概览</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">总项目数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
              <div className="text-sm text-gray-600">活跃项目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.completed}
              </div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.onHold}
              </div>
              <div className="text-sm text-gray-600">暂停中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats.cancelled}
              </div>
              <div className="text-sm text-gray-600">已取消</div>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>完成率</span>
                <span>
                  {Math.round((stats.completed / stats.total) * 100)}%
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无项目
              </h3>
              <p className="text-gray-600 mb-4">
                创建您的第一个项目来开始管理复杂任务
              </p>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建新项目
              </button>
            </div>
          ) : (
            <ProjectList onEditProject={handleEditProject} showActions={true} />
          )}
        </div>

        {/* 项目表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProject ? '编辑项目' : '创建项目'}
          </h2>

          {showForm ? (
            <ProjectForm
              project={editingProject || undefined}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">✏️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                选择操作
              </h3>
              <p className="text-gray-600 mb-4">
                点击"新建项目"创建项目，或选择现有项目进行编辑
              </p>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建新项目
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 项目行动关联信息 */}
      {projects.length > 0 && projectActionStats.size > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            项目行动统计
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects
              .filter((project) => projectActionStats.has(project.id))
              .slice(0, 6)
              .map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-white rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {project.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.status === ProjectStatus.ACTIVE
                        ? '活跃'
                        : project.status === ProjectStatus.COMPLETED
                          ? '已完成'
                          : project.status === ProjectStatus.ON_HOLD
                            ? '暂停'
                            : '已取消'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {projectActionStats.get(project.id)}
                    </div>
                    <div className="text-xs text-gray-500">行动</div>
                  </div>
                </div>
              ))}
          </div>
          {projectActionStats.size > 6 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              还有 {projectActionStats.size - 6} 个项目包含行动...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
