import { useState } from 'react';
import { Flag, Calendar, Tag } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export default function ActionRow({
  action,
  onComplete,
  onFlag,
  onClick,
  showProject = true,
  selected = false
}) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (completing) return;

    setCompleting(true);
    try {
      await onComplete(action.id);
    } catch (error) {
      setCompleting(false);
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    await onFlag(action.id, !action.is_flagged);
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);

    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueDateColor = (dateStr) => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);

    if (isPast(date) && !isToday(date)) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (isToday(date)) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  };

  return (
    <div
      onClick={() => onClick?.(action)}
      className={`action-row flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 ${
        selected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
      } ${completing ? 'action-complete' : ''}`}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          completing
            ? 'border-green-500 bg-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
        }`}
      >
        {completing && (
          <svg className="w-3 h-3 text-white checkbox-animate" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="24"
              strokeDashoffset="24"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-gray-900 dark:text-white truncate ${
            completing ? 'line-through text-gray-400' : ''
          }`}>
            {action.title}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1">
          {showProject && action.project_name && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
              {action.project_name}
            </span>
          )}

          {action.tags?.length > 0 && (
            <div className="flex items-center gap-1">
              {action.tags.slice(0, 3).map(tag => (
                <span
                  key={tag.id}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {action.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{action.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Due date */}
      {action.due_date && (
        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 flex-shrink-0 ${getDueDateColor(action.due_date)}`}>
          <Calendar className="w-3 h-3" />
          {formatDueDate(action.due_date)}
        </span>
      )}

      {/* Flag */}
      <button
        onClick={handleFlag}
        className={`p-1 rounded transition-colors flex-shrink-0 ${
          action.is_flagged
            ? 'text-amber-500 hover:text-amber-600'
            : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
        }`}
      >
        <Flag className="w-4 h-4" fill={action.is_flagged ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
