import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, AlertCircle } from 'lucide-react';
import { actions as actionsApi } from '../../services/api';
import ActionRow from '../common/ActionRow';
import { format, isToday, isTomorrow, startOfDay, addDays, parseISO, isPast } from 'date-fns';

export default function ForecastPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshStats } = useOutletContext();

  const fetchItems = useCallback(async () => {
    try {
      // Get all actions with due dates
      const data = await actionsApi.getAll({ status: 'active', includeInbox: 'true' });
      // Filter to only items with due dates and sort by date
      const withDates = data.filter(a => a.due_date);
      withDates.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      setItems(withDates);
    } catch (error) {
      console.error('Failed to fetch forecast items:', error);
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

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    const date = startOfDay(parseISO(item.due_date)).toISOString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return format(date, 'EEEE, MMM d') + ' (Overdue)';
    return format(date, 'EEEE, MMM d');
  };

  const getDateStyle = (dateStr) => {
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) {
      return 'text-red-600 dark:text-red-400';
    }
    if (isToday(date)) {
      return 'text-amber-600 dark:text-amber-400';
    }
    return 'text-gray-900 dark:text-white';
  };

  const overdue = items.filter(item => isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date)));
  const todayItems = items.filter(item => isToday(parseISO(item.due_date)));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Forecast</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {overdue.length > 0 && (
                <span className="text-red-600 dark:text-red-400">{overdue.length} overdue, </span>
              )}
              {todayItems.length} due today
            </p>
          </div>
        </div>
      </header>

      {/* Overdue Warning */}
      {overdue.length > 0 && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">
            You have {overdue.length} overdue {overdue.length === 1 ? 'item' : 'items'} that need attention
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Scheduled Items</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Actions with due dates will appear here. Add due dates to your actions to see them in the forecast.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date}>
                {/* Date Header */}
                <div className={`px-6 py-2 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium ${getDateStyle(date)}`}>
                  {getDateLabel(date)}
                  <span className="ml-2 text-gray-400">({dateItems.length})</span>
                </div>

                {/* Items for this date */}
                <div>
                  {dateItems.map(item => (
                    <ActionRow
                      key={item.id}
                      action={item}
                      onComplete={handleComplete}
                      onFlag={handleFlag}
                      showProject={true}
                    />
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
