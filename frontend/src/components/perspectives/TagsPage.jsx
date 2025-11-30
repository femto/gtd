import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tag as TagIcon, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { tags as tagsApi, actions as actionsApi } from '../../services/api';
import ActionRow from '../common/ActionRow';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [tagActions, setTagActions] = useState({});
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const { refreshStats } = useOutletContext();

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleTag = async (tagId) => {
    const newExpanded = new Set(expandedTags);

    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId);
    } else {
      newExpanded.add(tagId);
      // Fetch actions if not already loaded
      if (!tagActions[tagId]) {
        try {
          const actions = await tagsApi.getActions(tagId);
          setTagActions(prev => ({ ...prev, [tagId]: actions }));
        } catch (error) {
          console.error('Failed to fetch tag actions:', error);
        }
      }
    }

    setExpandedTags(newExpanded);
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const tag = await tagsApi.create({ name: newTagName.trim() });
      setTags([...tags, tag]);
      setNewTagName('');
      setShowNewTag(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleCompleteAction = async (actionId, tagId) => {
    try {
      await actionsApi.complete(actionId);
      setTagActions(prev => ({
        ...prev,
        [tagId]: prev[tagId].filter(a => a.id !== actionId)
      }));
      // Update tag action count
      setTags(prev => prev.map(t =>
        t.id === tagId ? { ...t, action_count: t.action_count - 1 } : t
      ));
      refreshStats();
    } catch (error) {
      console.error('Failed to complete action:', error);
      throw error;
    }
  };

  const handleFlagAction = async (actionId, flagged, tagId) => {
    try {
      if (flagged) {
        await actionsApi.flag(actionId);
      } else {
        await actionsApi.unflag(actionId);
      }
      setTagActions(prev => ({
        ...prev,
        [tagId]: prev[tagId].map(a =>
          a.id === actionId ? { ...a, is_flagged: flagged } : a
        )
      }));
    } catch (error) {
      console.error('Failed to flag action:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <TagIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tags</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewTag(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Tag
        </button>
      </header>

      {/* New Tag Form */}
      {showNewTag && (
        <form
          onSubmit={handleCreateTag}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="flex items-center gap-3">
            <TagIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name..."
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
              onClick={() => { setShowNewTag(false); setNewTagName(''); }}
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
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <TagIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Tags Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Create tags to organize your actions by context, location, or any category.
            </p>
            <button
              onClick={() => setShowNewTag(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Tag
            </button>
          </div>
        ) : (
          <div>
            {tags.map(tag => (
              <div key={tag.id} className="border-b border-gray-100 dark:border-gray-800">
                {/* Tag Row */}
                <div
                  onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <button className="p-0.5 text-gray-400">
                    {expandedTags.has(tag.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />

                  <span className="flex-1 font-medium text-gray-900 dark:text-white">
                    {tag.name}
                  </span>

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tag.action_count} {tag.action_count === 1 ? 'action' : 'actions'}
                  </span>
                </div>

                {/* Tag Actions */}
                {expandedTags.has(tag.id) && (
                  <div className="pl-12 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    {tagActions[tag.id]?.length > 0 ? (
                      tagActions[tag.id].map(action => (
                        <ActionRow
                          key={action.id}
                          action={action}
                          onComplete={(id) => handleCompleteAction(id, tag.id)}
                          onFlag={(id, flagged) => handleFlagAction(id, flagged, tag.id)}
                          showProject={true}
                        />
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No actions with this tag
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
