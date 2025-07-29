/**
 * 增强搜索栏组件
 * 提供全文搜索、建议、历史记录等功能
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  searchService,
  type SearchSuggestion,
} from '../../utils/search-service';
import { useGTDStore } from '../../store/gtd-store';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  showHistory?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '搜索任务、项目...',
  className = '',
  showSuggestions = true,
  showHistory = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从store获取数据用于建议
  const { contexts, projects } = useGTDStore();

  // 获取搜索建议
  const updateSuggestions = useCallback(
    (query: string) => {
      if (!query.trim()) {
        if (showHistory) {
          const history = searchService.getSearchHistory().slice(0, 5);
          setSuggestions(
            history.map((item) => ({
              text: item.query,
              type: 'history' as const,
              count: item.resultCount,
            }))
          );
        } else {
          setSuggestions([]);
        }
        return;
      }

      if (showSuggestions) {
        // 提取所有标签
        const allTags = new Set<string>();
        // 这里可以从actions和projects中提取标签
        // 暂时使用空数组
        const tags: string[] = Array.from(allTags);

        const newSuggestions = searchService.getSuggestions(query, {
          contexts: contexts.map((c) => ({ id: c.id, name: c.name })),
          projects,
          tags,
        });
        setSuggestions(newSuggestions);
      }
    },
    [contexts, projects, showSuggestions, showHistory]
  );

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape 清空搜索或关闭下拉框
      if (e.key === 'Escape') {
        if (showDropdown) {
          setShowDropdown(false);
          setSelectedIndex(-1);
        } else if (isFocused) {
          onChange('');
          inputRef.current?.blur();
        }
      }

      // 上下箭头导航建议
      if (showDropdown && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, showDropdown, suggestions, selectedIndex, onChange]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 输入变化处理
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    updateSuggestions(newValue);
    setSelectedIndex(-1);
  };

  // 焦点处理
  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
    updateSuggestions(value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // 延迟关闭下拉框，允许点击建议
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // 建议选择处理
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    const newValue = suggestion.text;
    onChange(newValue);
    setShowDropdown(false);
    setSelectedIndex(-1);

    if (onSearch) {
      onSearch(newValue);
    }

    inputRef.current?.focus();
  };

  // 搜索提交处理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSearch) {
      onSearch(value.trim());
    }
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // 清空搜索
  const handleClear = () => {
    onChange('');
    updateSuggestions('');
    inputRef.current?.focus();
  };

  // 删除历史记录项目
  const handleRemoveHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    searchService.removeFromHistory(query);
    updateSuggestions(value);
  };

  // 获取建议图标
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'history':
        return (
          <svg
            className="h-4 w-4 text-gray-400"
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
      case 'context':
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
      case 'tag':
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* 搜索图标 */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
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
          </div>

          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              isFocused ? 'bg-white' : 'bg-gray-50'
            }`}
            autoComplete="off"
          />

          {/* 右侧操作区域 */}
          <div className="absolute inset-y-0 right-0 flex items-center">
            {/* 清空按钮 */}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="清空搜索"
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
            )}

            {/* 快捷键提示 */}
            {!isFocused && !value && (
              <div className="mr-3 text-xs text-gray-400 hidden sm:block">
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* 搜索建议下拉框 */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.text}`}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getSuggestionIcon(suggestion.type)}
                <span className="text-sm truncate">{suggestion.text}</span>
                {suggestion.count !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({suggestion.count})
                  </span>
                )}
              </div>

              {suggestion.type === 'history' && (
                <button
                  onClick={(e) => handleRemoveHistory(suggestion.text, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  title="删除历史记录"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
