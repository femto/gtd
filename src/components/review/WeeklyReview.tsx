/**
 * 每周回顾组件
 * 实现GTD每周回顾功能，包括回顾检查清单、项目进展回顾和系统数据统计
 */

import { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import { ProjectStatus, ActionStatus } from '../../types/enums';

interface WeeklyReviewProps {
  onClose?: () => void;
}

interface ReviewChecklist {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'collect' | 'process' | 'organize' | 'review';
}

const defaultChecklist: ReviewChecklist[] = [
  {
    id: 'collect-loose-papers',
    title: '收集散落的纸张和材料',
    description: '收集桌面、钱包、口袋中的所有纸张和材料',
    completed: false,
    category: 'collect',
  },
  {
    id: 'process-notes',
    title: '处理笔记和想法',
    description: '处理记事本、便签中的所有笔记和想法',
    completed: false,
    category: 'collect',
  },
  {
    id: 'empty-inbox',
    title: '清空工作篮',
    description: '处理工作篮中的所有未处理项目',
    completed: false,
    category: 'process',
  },
  {
    id: 'review-calendar',
    title: '回顾日程安排',
    description: '检查过去一周和未来几周的日程安排',
    completed: false,
    category: 'review',
  },
  {
    id: 'review-waiting-for',
    title: '回顾等待清单',
    description: '检查等待他人的项目，确定需要跟进的事项',
    completed: false,
    category: 'review',
  },
  {
    id: 'review-projects',
    title: '回顾项目清单',
    description: '检查所有活跃项目的状态和下一步行动',
    completed: false,
    category: 'organize',
  },
  {
    id: 'review-someday-maybe',
    title: '回顾将来/也许清单',
    description: '检查将来可能要做的项目，决定是否激活',
    completed: false,
    category: 'organize',
  },
];

export const WeeklyReview: React.FC<WeeklyReviewProps> = ({ onClose }) => {
  const {
    reviewData,
    isReviewing,
    reviewError,
    lastReviewDate,
    generateWeeklyReview,
    updateProjectStatus,
    projects,
    actions,
    inboxItems,
    clearReviewError,
  } = useGTDStore();

  const [checklist, setChecklist] =
    useState<ReviewChecklist[]>(defaultChecklist);
  const [currentStep, setCurrentStep] = useState<
    'checklist' | 'projects' | 'statistics'
  >('checklist');
  const [reviewNotes, setReviewNotes] = useState('');
  const [projectUpdates, setProjectUpdates] = useState<
    Record<string, ProjectStatus>
  >({});

  useEffect(() => {
    generateWeeklyReview();
    return () => clearReviewError();
  }, [generateWeeklyReview, clearReviewError]);

  const handleChecklistToggle = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleProjectStatusUpdate = (
    projectId: string,
    status: ProjectStatus
  ) => {
    setProjectUpdates((prev) => ({ ...prev, [projectId]: status }));
  };

  const handleSaveProjectUpdates = async () => {
    try {
      for (const [projectId, status] of Object.entries(projectUpdates)) {
        await updateProjectStatus(projectId, status);
      }
      setProjectUpdates({});
    } catch (error) {
      console.error('更新项目状态失败:', error);
    }
  };

  const getChecklistProgress = () => {
    const completed = checklist.filter((item) => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const getProjectsByStatus = (status: ProjectStatus) => {
    return projects.filter((project) => project.status === status);
  };

  const getUnprocessedInboxCount = () => {
    return inboxItems.filter((item) => !item.processed).length;
  };

  const getOverdueActions = () => {
    const now = new Date();
    return actions.filter(
      (action) =>
        action.status === ActionStatus.NEXT &&
        action.dueDate &&
        action.dueDate < now
    );
  };

  const renderChecklist = () => {
    const categories = {
      collect: '收集',
      process: '处理',
      organize: '组织',
      review: '回顾',
    };

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">回顾进度</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1 bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getChecklistProgress()}%` }}
              />
            </div>
            <span className="text-blue-900 font-medium">
              {getChecklistProgress()}%
            </span>
          </div>
        </div>

        {Object.entries(categories).map(([category, title]) => (
          <div
            key={category}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
            <div className="space-y-2">
              {checklist
                .filter((item) => item.category === category)
                .map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={item.completed}
                      onChange={() => handleChecklistToggle(item.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={item.id}
                        className={`block text-sm font-medium cursor-pointer ${
                          item.completed
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">回顾笔记</h4>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="记录本次回顾的想法、发现和改进建议..."
            className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    );
  };

  const renderProjectReview = () => {
    const activeProjects = getProjectsByStatus(ProjectStatus.ACTIVE);
    const onHoldProjects = getProjectsByStatus(ProjectStatus.ON_HOLD);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">活跃项目回顾</h4>
          {activeProjects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无活跃项目</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((project) => {
                const projectActions = actions.filter(
                  (a) => a.projectId === project.id
                );
                const nextActions = projectActions.filter(
                  (a) => a.status === ActionStatus.NEXT
                );
                const completedActions = projectActions.filter(
                  (a) => a.status === ActionStatus.COMPLETED
                );

                return (
                  <div
                    key={project.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          {project.title}
                        </h5>
                        {project.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <select
                        value={projectUpdates[project.id] || project.status}
                        onChange={(e) =>
                          handleProjectStatusUpdate(
                            project.id,
                            e.target.value as ProjectStatus
                          )
                        }
                        className="ml-4 text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={ProjectStatus.ACTIVE}>活跃</option>
                        <option value={ProjectStatus.ON_HOLD}>暂停</option>
                        <option value={ProjectStatus.COMPLETED}>完成</option>
                        <option value={ProjectStatus.CANCELLED}>取消</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {nextActions.length}
                        </div>
                        <div className="text-gray-600">下一步行动</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {completedActions.length}
                        </div>
                        <div className="text-gray-600">已完成行动</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-600">
                          {projectActions.length}
                        </div>
                        <div className="text-gray-600">总行动数</div>
                      </div>
                    </div>

                    {nextActions.length === 0 && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        ⚠️ 此项目没有下一步行动，可能需要添加或重新评估项目状态
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {onHoldProjects.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-4">暂停项目回顾</h4>
            <div className="space-y-3">
              {onHoldProjects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {project.title}
                      </h5>
                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <select
                      value={projectUpdates[project.id] || project.status}
                      onChange={(e) =>
                        handleProjectStatusUpdate(
                          project.id,
                          e.target.value as ProjectStatus
                        )
                      }
                      className="ml-4 text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={ProjectStatus.ACTIVE}>重新激活</option>
                      <option value={ProjectStatus.ON_HOLD}>保持暂停</option>
                      <option value={ProjectStatus.COMPLETED}>标记完成</option>
                      <option value={ProjectStatus.CANCELLED}>取消项目</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(projectUpdates).length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveProjectUpdates}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              保存项目状态更新
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderStatistics = () => {
    const overdueActions = getOverdueActions();
    const unprocessedCount = getUnprocessedInboxCount();

    return (
      <div className="space-y-6">
        {reviewData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {reviewData.completedActions}
              </div>
              <div className="text-sm text-green-800">本周完成行动</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reviewData.completedProjects}
              </div>
              <div className="text-sm text-blue-800">本周完成项目</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {reviewData.pendingActions}
              </div>
              <div className="text-sm text-yellow-800">待处理行动</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reviewData.pendingProjects}
              </div>
              <div className="text-sm text-purple-800">活跃项目</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reviewData.waitingItems}
              </div>
              <div className="text-sm text-orange-800">等待项目</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">
                {unprocessedCount}
              </div>
              <div className="text-sm text-gray-800">未处理收集</div>
            </div>
          </div>
        )}

        {overdueActions.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-3">
              ⚠️ 过期行动 ({overdueActions.length})
            </h4>
            <div className="space-y-2">
              {overdueActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-red-800">{action.title}</span>
                  <span className="text-red-600">
                    {action.dueDate?.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {unprocessedCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">
              📥 工作篮提醒
            </h4>
            <p className="text-yellow-800 text-sm">
              您的工作篮中还有 {unprocessedCount}{' '}
              个未处理的项目，建议在回顾过程中处理完毕。
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">系统健康状况</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">工作篮清空状态</span>
              <span
                className={`text-sm font-medium ${unprocessedCount === 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {unprocessedCount === 0
                  ? '✅ 已清空'
                  : `❌ ${unprocessedCount} 项未处理`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">过期行动</span>
              <span
                className={`text-sm font-medium ${overdueActions.length === 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {overdueActions.length === 0
                  ? '✅ 无过期'
                  : `❌ ${overdueActions.length} 项过期`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">上次回顾</span>
              <span className="text-sm text-gray-900">
                {lastReviewDate
                  ? lastReviewDate.toLocaleDateString()
                  : '从未回顾'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (reviewError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            回顾生成失败
          </h3>
          <p className="text-red-800">{reviewError}</p>
          <button
            onClick={() => generateWeeklyReview()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">每周回顾</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="mt-4 flex space-x-1">
            {[
              { key: 'checklist', label: '回顾检查清单' },
              { key: 'projects', label: '项目回顾' },
              { key: 'statistics', label: '数据统计' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCurrentStep(key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentStep === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {isReviewing ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">正在生成回顾数据...</span>
            </div>
          ) : (
            <>
              {currentStep === 'checklist' && renderChecklist()}
              {currentStep === 'projects' && renderProjectReview()}
              {currentStep === 'statistics' && renderStatistics()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
