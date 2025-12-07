import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { actions as actionsApi } from '../../services/api';
import { format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';

export default function CompletedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const data = await actionsApi.getAll({ status: 'completed', includeInbox: 'true' });
      // Sort by completion date, most recent first
      data.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch completed items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUncomplete = async (id) => {
    try {
      await actionsApi.uncomplete(id);
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to uncomplete action:', error);
    }
  };

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    if (!item.completed_at) return acc;
    const date = startOfDay(parseISO(item.completed_at)).toISOString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Completed</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} completed {items.length === 1 ? 'item' : 'items'}
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
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Completed Items</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Completed actions will appear here. Start checking off your tasks!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {getDateLabel(date)}
                  <span className="ml-2 text-gray-400">({dateItems.length})</span>
                </div>

                {/* Items for this date */}
                <div>
                  {dateItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 line-through truncate block">
                          {item.title}
                        </span>
                        {item.project_name && (
                          <span className="text-xs text-gray-400">
                            {item.project_name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUncomplete(item.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Mark as incomplete"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
