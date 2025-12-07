import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  PauseCircle
} from 'lucide-react';
import { projects as projectsApi, actions as actionsApi } from '../../services/api';
import ActionRow from '../common/ActionRow';

// Inline component for adding actions to a project
function AddActionForm({ projectId, onAdd }) {
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || adding) return;

    setAdding(true);
    try {
      const action = await actionsApi.create({
        title: title.trim(),
        projectId,
        isInbox: false
      });
      onAdd(action);
      setTitle('');
    } catch (error) {
      console.error('Failed to add action:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
      <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex-shrink-0" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add an action..."
        className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-0"
      />
      {title.trim() && (
        <button
          type="submit"
          disabled={adding}
          className="flex items-center gap-1 px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      )}
    </form>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectActions, setProjectActions] = useState({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { refreshStats } = useOutletContext();

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectsApi.getAll({ status: 'active' });
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleProject = async (projectId) => {
    const newExpanded = new Set(expandedProjects);

    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      // Fetch actions if not already loaded
      if (!projectActions[projectId]) {
        try {
          const actions = await projectsApi.getActions(projectId, { status: 'active' });
          setProjectActions(prev => ({ ...prev, [projectId]: actions }));
        } catch (error) {
          console.error('Failed to fetch project actions:', error);
        }
      }
    }

    setExpandedProjects(newExpanded);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const project = await projectsApi.create({ name: newProjectName.trim() });
      setProjects([project, ...projects]);
      setNewProjectName('');
      setShowNewProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCompleteAction = async (actionId, projectId) => {
    try {
      await actionsApi.complete(actionId);
      setProjectActions(prev => ({
        ...prev,
        [projectId]: prev[projectId].filter(a => a.id !== actionId)
      }));
      // Update project action count
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, active_action_count: p.active_action_count - 1, completed_action_count: p.completed_action_count + 1 }
          : p
      ));
      refreshStats();
    } catch (error) {
      console.error('Failed to complete action:', error);
      throw error;
    }
  };

  const handleFlagAction = async (actionId, flagged, projectId) => {
    try {
      if (flagged) {
        await actionsApi.flag(actionId);
      } else {
        await actionsApi.unflag(actionId);
      }
      setProjectActions(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(a =>
          a.id === actionId ? { ...a, is_flagged: flagged } : a
        )
      }));
    } catch (error) {
      console.error('Failed to flag action:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'on_hold':
        return <PauseCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {projects.length} active {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </header>

      {/* New Project Form */}
      {showNewProject && (
        <form
          onSubmit={handleCreateProject}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="flex items-center gap-3">
            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowNewProject(false); setNewProjectName(''); }}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Projects Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Create your first project to organize related actions together.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        ) : (
          <div>
            {projects.map(project => (
              <div key={project.id} className="border-b border-gray-100 dark:border-gray-800">
                {/* Project Row */}
                <div
                  onClick={() => toggleProject(project.id)}
                  className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <button className="p-0.5 text-gray-400">
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {getStatusIcon(project.status)}

                  <span className="flex-1 font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </span>

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {project.active_action_count} actions
                  </span>

                  {/* Progress bar */}
                  {(project.active_action_count + project.completed_action_count) > 0 && (
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{
                          width: `${(project.completed_action_count / (project.active_action_count + project.completed_action_count)) * 100}%`
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Project Actions */}
                {expandedProjects.has(project.id) && (
                  <div className="pl-12 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    {/* Add Action Form */}
                    <AddActionForm
                      projectId={project.id}
                      onAdd={(action) => {
                        setProjectActions(prev => ({
                          ...prev,
                          [project.id]: [...(prev[project.id] || []), action]
                        }));
                        setProjects(prev => prev.map(p =>
                          p.id === project.id
                            ? { ...p, active_action_count: p.active_action_count + 1 }
                            : p
                        ));
                      }}
                    />
                    {projectActions[project.id]?.length > 0 ? (
                      projectActions[project.id].map(action => (
                        <ActionRow
                          key={action.id}
                          action={action}
                          onComplete={(id) => handleCompleteAction(id, project.id)}
                          onFlag={(id, flagged) => handleFlagAction(id, flagged, project.id)}
                          showProject={false}
                        />
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No active actions in this project
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
