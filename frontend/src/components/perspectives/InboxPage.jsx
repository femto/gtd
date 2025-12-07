import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';
import { inbox as inboxApi, actions as actionsApi } from '../../services/api';
import ActionRow from '../common/ActionRow';

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const { refreshStats } = useOutletContext();

  const fetchItems = useCallback(async () => {
    try {
      const data = await inboxApi.getAll();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Listen for inbox updates from quick entry
  useEffect(() => {
    const handleInboxUpdate = () => {
      fetchItems();
    };

    window.addEventListener('inbox-updated', handleInboxUpdate);
    return () => window.removeEventListener('inbox-updated', handleInboxUpdate);
  }, [fetchItems]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim() || adding) return;

    setAdding(true);
    try {
      const newItem = await inboxApi.create({ title: newItemTitle.trim() });
      setItems([newItem, ...items]);
      setNewItemTitle('');
      refreshStats();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await actionsApi.complete(id);
      setItems(items.filter(item => item.id !== id));
      refreshStats();
    } catch (error) {
      console.error('Failed to complete action:', error);
      throw error;
    }
  };

  const handleFlag = async (id, flagged) => {
    try {
      if (flagged) {
        await actionsApi.flag(id);
      } else {
        await actionsApi.unflag(id);
      }
      setItems(items.map(item =>
        item.id === id ? { ...item, is_flagged: flagged } : item
      ));
    } catch (error) {
      console.error('Failed to flag action:', error);
    }
  };

  const handleItemClick = (action) => {
    // TODO: Open action detail panel
    console.log('Open action:', action);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Inbox className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Inbox</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} {items.length === 1 ? 'item' : 'items'} to process
            </p>
          </div>
        </div>
      </header>

      {/* Quick Add */}
      <form onSubmit={handleAddItem} className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add a new item to inbox..."
            className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0"
          />
          {newItemTitle.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      </form>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Inbox Zero!</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              You've processed all your inbox items. Use Quick Entry (Cmd+N) to capture new thoughts.
            </p>
          </div>
        ) : (
          <div>
            {items.map(item => (
              <ActionRow
                key={item.id}
                action={item}
                onComplete={handleComplete}
                onFlag={handleFlag}
                onClick={handleItemClick}
                showProject={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
