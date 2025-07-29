/**
 * 搜索结果组件
 * 显示搜索结果并支持关键词高亮
 */

import React from 'react';
import type { SearchResult } from '../../types/interfaces';
import type {
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  InboxItem,
} from '../../types/interfaces';
import { ActionStatus, ProjectStatus, Priority } from '../../types/enums';
import { searchService } from '../../utils/search-service';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onItemClick?: (result: SearchResult) => void;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  onItemClick,
  className = '',
}) => {
  // 获取优先级颜色
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'text-red-600 bg-red-50';
      case Priority.HIGH:
        return 'text-orange-600 bg-orange-50';
      case Priority.MEDIUM:
        return 'text-yellow-600 bg-yellow-50';
      case Priority.LOW:
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: ActionStatus | ProjectStatus) => {
    switch (status) {
      case ActionStatus.NEXT:
      case ProjectStatus.ACTIVE:
        return 'text-blue-600 bg-blue-50';
      case ActionStatus.WAITING:
      case ProjectStatus.ON_HOLD:
        return 'text-yellow-600 bg-yellow-50';
      case ActionStatus.SCHEDULED:
        return 'text-purple-600 bg-purple-50';
      case ActionStatus.COMPLETED:
      case ProjectStatus.COMPLETED:
        return 'text-green-600 bg-green-50';
      case ActionStatus.CANCELLED:
      case ProjectStatus.CANCELLED:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action':
        return (
          <svg
            className="h-4 w-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        );
      case 'project':
        return (
          <svg
            className="h-4 w-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        );
      case 'waiting':
        return (
          <svg
            className="h-4 w-4 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'calendar':
        return (
          <svg
            className="h-4 w-4 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case 'inbox':
        return (
          <svg
            className="h-4 w-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'action':
        return '行动';
      case 'project':
        return '项目';
      case 'waiting':
        return '等待';
      case 'calendar':
        return '日程';
      case 'inbox':
        return '工作篮';
      default:
        return type;
    }
  };

  // 渲染行动结果
  const renderActionResult = (action: Action, matches: string[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3
          className="font-medium text-gray-900"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(action.title, query),
          }}
        />
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}
          >
            {action.priority}
          </span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action.status)}`}
          >
            {action.status}
          </span>
        </div>
      </div>

      {action.description && (
        <p
          className="text-sm text-gray-600"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(action.description, query),
          }}
        />
      )}

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        {action.dueDate && (
          <span>截止: {action.dueDate.toLocaleDateString()}</span>
        )}
        {action.estimatedTime && <span>预估: {action.estimatedTime}分钟</span>}
        {matches.length > 0 && <span>匹配字段: {matches.join(', ')}</span>}
      </div>
    </div>
  );

  // 渲染项目结果
  const renderProjectResult = (project: Project, matches: string[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3
          className="font-medium text-gray-900"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(project.title, query),
          }}
        />
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}
        >
          {project.status}
        </span>
      </div>

      {project.description && (
        <p
          className="text-sm text-gray-600"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(project.description, query),
          }}
        />
      )}

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>创建: {project.createdAt.toLocaleDateString()}</span>
        {project.completedAt && (
          <span>完成: {project.completedAt.toLocaleDateString()}</span>
        )}
        {matches.length > 0 && <span>匹配字段: {matches.join(', ')}</span>}
      </div>
    </div>
  );

  // 渲染等待项目结果
  const renderWaitingResult = (waiting: WaitingItem, matches: string[]) => (
    <div className="space-y-2">
      <h3
        className="font-medium text-gray-900"
        dangerouslySetInnerHTML={{
          __html: searchService.highlightMatches(waiting.title, query),
        }}
      />

      <p className="text-sm text-gray-600">
        等待:{' '}
        <span
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(waiting.waitingFor, query),
          }}
        />
      </p>

      {waiting.description && (
        <p
          className="text-sm text-gray-600"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(waiting.description, query),
          }}
        />
      )}

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>创建: {waiting.createdAt.toLocaleDateString()}</span>
        {waiting.followUpDate && (
          <span>跟进: {waiting.followUpDate.toLocaleDateString()}</span>
        )}
        {matches.length > 0 && <span>匹配字段: {matches.join(', ')}</span>}
      </div>
    </div>
  );

  // 渲染日程结果
  const renderCalendarResult = (calendar: CalendarItem, matches: string[]) => (
    <div className="space-y-2">
      <h3
        className="font-medium text-gray-900"
        dangerouslySetInnerHTML={{
          __html: searchService.highlightMatches(calendar.title, query),
        }}
      />

      {calendar.description && (
        <p
          className="text-sm text-gray-600"
          dangerouslySetInnerHTML={{
            __html: searchService.highlightMatches(calendar.description, query),
          }}
        />
      )}

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>开始: {calendar.startTime.toLocaleString()}</span>
        {calendar.endTime && (
          <span>结束: {calendar.endTime.toLocaleString()}</span>
        )}
        {calendar.location && (
          <span
            dangerouslySetInnerHTML={{
              __html: `地点: ${searchService.highlightMatches(calendar.location, query)}`,
            }}
          />
        )}
        {matches.length > 0 && <span>匹配字段: {matches.join(', ')}</span>}
      </div>
    </div>
  );

  // 渲染工作篮结果
  const renderInboxResult = (inbox: InboxItem, matches: string[]) => (
    <div className="space-y-2">
      <p
        className="text-gray-900"
        dangerouslySetInnerHTML={{
          __html: searchService.highlightMatches(inbox.content, query),
        }}
      />

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>类型: {inbox.type}</span>
        <span>创建: {inbox.createdAt.toLocaleDateString()}</span>
        <span>状态: {inbox.processed ? '已处理' : '未处理'}</span>
        {matches.length > 0 && <span>匹配字段: {matches.join(', ')}</span>}
      </div>
    </div>
  );

  // 渲染单个搜索结果
  const renderResult = (result: SearchResult) => {
    let content;

    switch (result.type) {
      case 'action':
        content = renderActionResult(result.item as Action, result.matches);
        break;
      case 'project':
        content = renderProjectResult(result.item as Project, result.matches);
        break;
      case 'waiting':
        content = renderWaitingResult(
          result.item as WaitingItem,
          result.matches
        );
        break;
      case 'calendar':
        content = renderCalendarResult(
          result.item as CalendarItem,
          result.matches
        );
        break;
      case 'inbox':
        content = renderInboxResult(result.item as InboxItem, result.matches);
        break;
      default:
        content = <div>未知类型</div>;
    }

    return (
      <div
        key={`${result.type}-${result.item.id}`}
        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onItemClick?.(result)}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">{getTypeIcon(result.type)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {getTypeLabel(result.type)}
              </span>
              <span className="text-xs text-gray-400">
                相关性: {Math.round((1 - result.score) * 100)}%
              </span>
            </div>

            {content}
          </div>
        </div>
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p>没有找到匹配的结果</p>
        <p className="text-sm mt-1">尝试使用不同的关键词或检查拼写</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          搜索结果 ({results.length})
        </h2>
        <div className="text-sm text-gray-500">搜索: "{query}"</div>
      </div>

      <div className="space-y-3">{results.map(renderResult)}</div>
    </div>
  );
};
