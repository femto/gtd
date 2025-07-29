/**
 * 项目列表组件
 * 显示和管理所有项目
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import type { Project } from '../../types/interfaces';
import { ProjectStatus } from '../../types/enums';

interface ProjectListProps {
  onSelectProject?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  selectedProjectId?: string;
  showActions?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  onSelectProject,
  onEditProject,
  selectedProjectId,
  showActions = true,
}) => {
  const {
    projects,
    actions,
    selectedProject,
    setSelectedProject,
    deleteProject,
    updateProject,
    organizeError,
    clearOrganizeError,
  } = useGTDStore();

  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>(
    'all'
  );

  useEffect(() => {
    let filtered = projects;
    if (filterStatus !== 'all') {
      filtered = projects.filter((p) => p.status === filterStatus);
    }
    setLocalProjects(filtered);
  }, [projects, filterStatus]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project.id);
    onSelectProject?.(project);
  };

  const handleStatusChange = async (
    project: Project,
    newStatus: ProjectStatus
  ) => {
    try {
      const updates: Partial<Project> = { status: newStatus };
      if (newStatus === ProjectStatus.COMPLETED) {
        updates.completedAt = new Date();
      }
      await updateProject(project.id, updates);
    } catch (error) {
      console.error('更新项目状态失败:', error);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (window.confirm(`确定要删除项目"${project.title}"吗？`)) {
      try {
        await deleteProject(project.id);
      } catch (error) {
        console.error('删除项目失败:', error);
      }
    }
  };

  const getProjectActionCount = (projectId: string) => {
    return actions.filter((action) => action.projectId === projectId).length;
  };

  const getStatusDisplayName = (status: ProjectStatus) => {
    const names = {
      [ProjectStatus.ACTIVE]: '活跃',
      [ProjectStatus.ON_HOLD]: '暂停',
      [ProjectStatus.COMPLETED]: '已完成',
      [ProjectStatus.CANCELLED]: '已取消',
    };
    return names[status];
  };

  const getStatusColor = (status: ProjectStatus) => {
    const colors = {
      [ProjectStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [ProjectStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800',
      [ProjectStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
      [ProjectStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  const statusOptions = [
    { value: 'all', label: '全部' },
    { value: ProjectStatus.ACTIVE, label: '活跃' },
    { value: ProjectStatus.ON_HOLD, label: '暂停' },
    { value: ProjectStatus.COMPLETED, label: '已完成' },
    { value: ProjectStatus.CANCELLED, label: '已取消' },
  ];

  return (
    <div className="space-y-4">
      {organizeError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{organizeError}</p>
              <button
                onClick={clearOrganizeError}
                className="mt-1 text-xs text-red-600 hover:text-red-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">状态过滤:</label>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as ProjectStatus | 'all')
          }
          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          共 {localProjects.length} 个项目
        </span>
      </div>

      {/* 项目列表 */}
      {localProjects.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📁</div>
          <p className="text-gray-500 text-sm">
            {filterStatus === 'all'
              ? '暂无项目'
              : `暂无${statusOptions.find((o) => o.value === filterStatus)?.label}项目`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localProjects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              actionCount={getProjectActionCount(project.id)}
              isSelected={
                selectedProjectId === project.id ||
                selectedProject === project.id
              }
              onSelect={() => handleSelectProject(project)}
              onEdit={onEditProject}
              onStatusChange={(status) => handleStatusChange(project, status)}
              onDelete={() => handleDeleteProject(project)}
              showActions={showActions}
              getStatusDisplayName={getStatusDisplayName}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ProjectItemProps {
  project: Project;
  actionCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: (project: Project) => void;
  onStatusChange: (status: ProjectStatus) => void;
  onDelete: () => void;
  showActions: boolean;
  getStatusDisplayName: (status: ProjectStatus) => string;
  getStatusColor: (status: ProjectStatus) => string;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  actionCount,
  isSelected,
  onSelect,
  onEdit,
  onStatusChange,
  onDelete,
  showActions,
  getStatusDisplayName,
  getStatusColor,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusOptions = [
    ProjectStatus.ACTIVE,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ];

  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors
        ${
          isSelected
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3 mb-2">
          <h4 className="font-medium text-gray-900 truncate">
            {project.title}
          </h4>
          <span
            className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}
          >
            {getStatusDisplayName(project.status)}
          </span>
          {actionCount > 0 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              {actionCount} 个行动
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {project.description}
          </p>
        )}

        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>创建: {project.createdAt.toLocaleDateString()}</span>
          <span>更新: {project.updatedAt.toLocaleDateString()}</span>
          {project.completedAt && (
            <span>完成: {project.completedAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {showActions && (
        <div
          className="flex items-center space-x-2 ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 状态切换 */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              title="更改状态"
            >
              状态 ▼
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(status);
                      setShowStatusMenu(false);
                    }}
                    className={`
                      block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors
                      ${project.status === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    {getStatusDisplayName(status)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onEdit && (
            <button
              onClick={() => onEdit(project)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              title="编辑"
            >
              ✏️
            </button>
          )}

          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            title="删除"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};
