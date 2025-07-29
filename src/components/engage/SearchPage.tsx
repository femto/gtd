/**
 * 搜索页面组件
 * 集成搜索栏、过滤器和搜索结果
 */

import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { ActionFilters } from './ActionFilters';
import { useGTDStore } from '../../store/gtd-store';
import type { SearchResult, FilterCriteria } from '../../types/interfaces';
import { searchService } from '../../utils/search-service';

interface SearchPageProps {
  className?: string;
}

export const SearchPage: React.FC<SearchPageProps> = ({ className = '' }) => {
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    setSearchQuery,
    performSearch,
    clearSearch,
    clearSearchError,
    contexts,
  } = useGTDStore();

  const [searchTypes, setSearchTypes] = useState<
    ('action' | 'project' | 'waiting' | 'calendar' | 'inbox')[]
  >(['action', 'project', 'waiting', 'calendar']);
  const [filters, setFilters] = useState<FilterCriteria | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [popularSearches, setPopularSearches] = useState<
    { query: string; count: number }[]
  >([]);

  // 加载热门搜索
  useEffect(() => {
    const popular = searchService.getPopularSearches(5);
    setPopularSearches(popular);
  }, []);

  // 执行搜索
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      clearSearch();
      return;
    }

    try {
      await performSearch(query, {
        types: searchTypes,
        limit: 50,
        filters: filters || undefined,
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // 处理搜索类型变化
  const handleTypeToggle = (
    type: 'action' | 'project' | 'waiting' | 'calendar' | 'inbox'
  ) => {
    const newTypes = searchTypes.includes(type)
      ? searchTypes.filter((t) => t !== type)
      : [...searchTypes, type];

    setSearchTypes(newTypes);

    // 如果有搜索查询，重新搜索
    if (searchQuery.trim()) {
      performSearch(searchQuery, {
        types: newTypes,
        limit: 50,
        filters: filters || undefined,
      });
    }
  };

  // 处理过滤器变化
  const handleFiltersChange = (newFilters: FilterCriteria | null) => {
    setFilters(newFilters);

    // 如果有搜索查询，重新搜索
    if (searchQuery.trim()) {
      performSearch(searchQuery, {
        types: searchTypes,
        limit: 50,
        filters: newFilters || undefined,
      });
    }
  };

  // 处理搜索结果点击
  const handleResultClick = (result: SearchResult) => {
    // 这里可以根据结果类型导航到相应的详情页面
    console.log('Clicked result:', result);
    // TODO: 实现导航逻辑
  };

  // 清空搜索
  const handleClearSearch = () => {
    clearSearch();
    setFilters(null);
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

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* 搜索头部 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">搜索</h1>
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              清空搜索
            </button>
          )}
        </div>

        {/* 搜索栏 */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder="搜索任务、项目、等待项目..."
          className="w-full"
        />

        {/* 搜索选项 */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索类型选择 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">搜索范围:</span>
            <div className="flex flex-wrap gap-2">
              {(
                ['action', 'project', 'waiting', 'calendar', 'inbox'] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    searchTypes.includes(type)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* 过滤器切换 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              showFilters || filters
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>过滤器</span>
          </button>
        </div>

        {/* 过滤器面板 */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4">
            <ActionFilters
              criteria={filters || {}}
              onChange={handleFiltersChange}
              contexts={contexts}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-red-700">{searchError}</span>
            <button
              onClick={clearSearchError}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg
                className="h-4 w-4"
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
          </div>
        </div>
      )}

      {/* 搜索结果或默认内容 */}
      {searchQuery ? (
        <div>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>搜索中...</span>
              </div>
            </div>
          ) : (
            <SearchResults
              results={searchResults}
              query={searchQuery}
              onItemClick={handleResultClick}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 热门搜索 */}
          {popularSearches.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                热门搜索
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map(({ query, count }) => (
                  <button
                    key={query}
                    onClick={() => {
                      setSearchQuery(query);
                      handleSearch(query);
                    }}
                    className="flex items-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{query}</span>
                    <span className="text-xs text-gray-500">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 搜索提示 */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">搜索提示</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• 使用关键词搜索任务标题、描述和备注</p>
              <p>• 使用 @上下文名 搜索特定上下文的任务</p>
              <p>• 使用 #项目名 搜索特定项目的内容</p>
              <p>• 使用 #标签 搜索带有特定标签的项目</p>
              <p>• 使用快捷键 ⌘K (Mac) 或 Ctrl+K (Windows) 快速聚焦搜索框</p>
            </div>
          </div>

          {/* 快速操作 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">快速操作</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchTypes(['action']);
                  handleSearch('status:next');
                }}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-6 w-6 text-blue-500"
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
                  <div>
                    <h4 className="font-medium text-gray-900">
                      查看所有下一步行动
                    </h4>
                    <p className="text-sm text-gray-500">
                      显示所有待执行的任务
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchTypes(['project']);
                  handleSearch('status:active');
                }}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-6 w-6 text-green-500"
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
                  <div>
                    <h4 className="font-medium text-gray-900">查看活跃项目</h4>
                    <p className="text-sm text-gray-500">
                      显示所有进行中的项目
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
