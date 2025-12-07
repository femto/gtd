import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';
import { review as reviewApi, projects as projectsApi } from '../../services/api';
import { format, parseISO } from 'date-fns';

export default function ReviewPage() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const { refreshStats } = useOutletContext();

  const fetchData = useCallback(async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        reviewApi.getProjects(),
        reviewApi.getStats()
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch review data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkReviewed = async (projectId) => {
    setReviewingId(projectId);
    try {
      await projectsApi.review(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      refreshStats();
    } catch (error) {
      console.error('Failed to mark project as reviewed:', error);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Review</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} due for review
            </p>
          </div>
        </div>
      </header>

      {/* Review Stats */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.projectsDueForReview || 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Due for Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.projectsReviewedThisWeek || 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reviewed This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inboxCount || 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Inbox Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdueActions || 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Overdue Actions</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">All Caught Up!</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              No projects are due for review. Great job keeping your system up to date!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map(project => (
              <div
                key={project.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {project.name}
                    </span>
                    {project.folder_name && (
                      <span className="text-xs text-gray-400 truncate">
                        in {project.folder_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{project.active_action_count} active actions</span>
                    {project.last_reviewed_at && (
                      <span>Last reviewed: {format(parseISO(project.last_reviewed_at), 'MMM d')}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMarkReviewed(project.id)}
                  disabled={reviewingId === project.id}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {reviewingId === project.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Mark Reviewed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
