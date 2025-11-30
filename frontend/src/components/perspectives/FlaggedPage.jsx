import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { actions as actionsApi } from '../../services/api';
import ActionRow from '../common/ActionRow';

export default function FlaggedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshStats } = useOutletContext();

  const fetchItems = useCallback(async () => {
    try {
      const data = await actionsApi.getAll({ flagged: 'true', includeInbox: 'true' });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch flagged items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
        // Re-fetch as it's now flagged
        const action = await actionsApi.get(id);
        setItems([action, ...items]);
      } else {
        await actionsApi.unflag(id);
        setItems(items.filter(item => item.id !== id));
      }
      refreshStats();
    } catch (error) {
      console.error('Failed to update flag:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <Flag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Flagged</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} flagged {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Flag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Flagged Items</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Flag important items to see them here. Use the flag icon on any action.
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
                showProject={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
