/**
 * 全文搜索服务
 * 使用Fuse.js实现高性能模糊搜索
 */

import Fuse from 'fuse.js';
import type {
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  InboxItem,
  SearchResult,
  FilterCriteria,
} from '../types/interfaces';

/**
 * 搜索配置
 */
const SEARCH_CONFIG = {
  // 搜索阈值，0.0 = 完全匹配，1.0 = 匹配任何内容
  threshold: 0.4,
  // 是否包含匹配分数
  includeScore: true,
  // 是否包含匹配位置信息
  includeMatches: true,
  // 最小匹配字符长度
  minMatchCharLength: 2,
  // 是否忽略位置
  ignoreLocation: true,
  // 搜索字段权重配置
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'content', weight: 0.4 }, // for InboxItem
    { name: 'notes', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
    { name: 'waitingFor', weight: 0.3 }, // for WaitingItem
    { name: 'location', weight: 0.1 }, // for CalendarItem
  ],
};

/**
 * 搜索历史项目
 */
export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
}

/**
 * 搜索建议项目
 */
export interface SearchSuggestion {
  text: string;
  type: 'history' | 'tag' | 'context' | 'project';
  count?: number;
}

/**
 * 搜索服务类
 */
export class SearchService {
  private actionsFuse: Fuse<Action> | null = null;
  private projectsFuse: Fuse<Project> | null = null;
  private waitingFuse: Fuse<WaitingItem> | null = null;
  private calendarFuse: Fuse<CalendarItem> | null = null;
  private inboxFuse: Fuse<InboxItem> | null = null;

  private searchHistory: SearchHistoryItem[] = [];
  private readonly maxHistorySize = 50;
  private readonly storageKey = 'gtd-search-history';

  constructor() {
    this.loadSearchHistory();
  }

  /**
   * 初始化搜索索引
   */
  initializeIndexes(data: {
    actions: Action[];
    projects: Project[];
    waitingItems: WaitingItem[];
    calendarItems: CalendarItem[];
    inboxItems: InboxItem[];
  }) {
    this.actionsFuse = new Fuse(data.actions, SEARCH_CONFIG);
    this.projectsFuse = new Fuse(data.projects, SEARCH_CONFIG);
    this.waitingFuse = new Fuse(data.waitingItems, SEARCH_CONFIG);
    this.calendarFuse = new Fuse(data.calendarItems, SEARCH_CONFIG);
    this.inboxFuse = new Fuse(data.inboxItems, SEARCH_CONFIG);
  }

  /**
   * 更新特定类型的索引
   */
  updateIndex(
    type: 'actions' | 'projects' | 'waiting' | 'calendar' | 'inbox',
    data: any[]
  ) {
    switch (type) {
      case 'actions':
        this.actionsFuse = new Fuse(data as Action[], SEARCH_CONFIG);
        break;
      case 'projects':
        this.projectsFuse = new Fuse(data as Project[], SEARCH_CONFIG);
        break;
      case 'waiting':
        this.waitingFuse = new Fuse(data as WaitingItem[], SEARCH_CONFIG);
        break;
      case 'calendar':
        this.calendarFuse = new Fuse(data as CalendarItem[], SEARCH_CONFIG);
        break;
      case 'inbox':
        this.inboxFuse = new Fuse(data as InboxItem[], SEARCH_CONFIG);
        break;
    }
  }

  /**
   * 执行全文搜索
   */
  search(
    query: string,
    options?: {
      types?: ('action' | 'project' | 'waiting' | 'calendar' | 'inbox')[];
      limit?: number;
      filters?: FilterCriteria;
    }
  ): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const {
      types = ['action', 'project', 'waiting', 'calendar'],
      limit = 50,
      filters,
    } = options || {};
    const results: SearchResult[] = [];

    // 搜索各个类型的数据
    if (types.includes('action') && this.actionsFuse) {
      const actionResults = this.actionsFuse.search(query);
      results.push(
        ...actionResults.map((result) => ({
          type: 'action' as const,
          item: result.item,
          matches: this.extractMatches(
            result.matches ? Array.from(result.matches) : []
          ),
          score: result.score || 0,
        }))
      );
    }

    if (types.includes('project') && this.projectsFuse) {
      const projectResults = this.projectsFuse.search(query);
      results.push(
        ...projectResults.map((result) => ({
          type: 'project' as const,
          item: result.item,
          matches: this.extractMatches(
            result.matches ? Array.from(result.matches) : []
          ),
          score: result.score || 0,
        }))
      );
    }

    if (types.includes('waiting') && this.waitingFuse) {
      const waitingResults = this.waitingFuse.search(query);
      results.push(
        ...waitingResults.map((result) => ({
          type: 'waiting' as const,
          item: result.item,
          matches: this.extractMatches(
            result.matches ? Array.from(result.matches) : []
          ),
          score: result.score || 0,
        }))
      );
    }

    if (types.includes('calendar') && this.calendarFuse) {
      const calendarResults = this.calendarFuse.search(query);
      results.push(
        ...calendarResults.map((result) => ({
          type: 'calendar' as const,
          item: result.item,
          matches: this.extractMatches(
            result.matches ? Array.from(result.matches) : []
          ),
          score: result.score || 0,
        }))
      );
    }

    if (types.includes('inbox') && this.inboxFuse) {
      const inboxResults = this.inboxFuse.search(query);
      results.push(
        ...inboxResults.map((result) => ({
          type: 'inbox' as const,
          item: result.item,
          matches: this.extractMatches(
            result.matches ? Array.from(result.matches) : []
          ),
          score: result.score || 0,
        }))
      );
    }

    // 按相关性排序
    const sortedResults = results.sort((a, b) => a.score - b.score);

    // 应用过滤器
    const filteredResults = filters
      ? this.applyFilters(sortedResults, filters)
      : sortedResults;

    // 限制结果数量
    const limitedResults = filteredResults.slice(0, limit);

    // 记录搜索历史
    this.addToHistory(query, limitedResults.length);

    return limitedResults;
  }

  /**
   * 提取匹配的字段名
   */
  private extractMatches(matches: readonly any[]): string[] {
    return Array.from(matches)
      .map((match) => match.key)
      .filter(Boolean);
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    results: SearchResult[],
    filters: FilterCriteria
  ): SearchResult[] {
    return results.filter((result) => {
      const item = result.item;

      // 上下文过滤
      if (filters.contexts && filters.contexts.length > 0) {
        if (
          result.type === 'action' &&
          !filters.contexts.includes((item as Action).contextId)
        ) {
          return false;
        }
      }

      // 优先级过滤
      if (filters.priorities && filters.priorities.length > 0) {
        if (
          result.type === 'action' &&
          !filters.priorities.includes((item as Action).priority)
        ) {
          return false;
        }
      }

      // 状态过滤
      if (filters.statuses && filters.statuses.length > 0) {
        if (
          result.type === 'action' &&
          !filters.statuses.includes((item as Action).status)
        ) {
          return false;
        }
        if (result.type === 'project' && filters.statuses.length > 0) {
          // 项目状态映射到行动状态进行过滤
          return false; // 简化处理，项目不参与状态过滤
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (result.type === 'action') {
          const action = item as Action;
          if (start && action.dueDate && action.dueDate < start) return false;
          if (end && action.dueDate && action.dueDate > end) return false;
        }
        if (result.type === 'calendar') {
          const calendarItem = item as CalendarItem;
          if (start && calendarItem.startTime < start) return false;
          if (end && calendarItem.startTime > end) return false;
        }
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const itemTags = (item as any).tags || [];
        if (!filters.tags.some((tag) => itemTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 高亮搜索关键词
   */
  highlightMatches(text: string, query: string): string {
    if (!query.trim()) return text;

    const words = query.trim().split(/\s+/);
    let highlightedText = text;

    words.forEach((word) => {
      const regex = new RegExp(`(${this.escapeRegExp(word)})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    });

    return highlightedText;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取搜索建议
   */
  getSuggestions(
    query: string,
    data: {
      contexts: { id: string; name: string }[];
      projects: Project[];
      tags: string[];
    }
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // 历史搜索建议
    const historyMatches = this.searchHistory
      .filter((item) => item.query.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map((item) => ({
        text: item.query,
        type: 'history' as const,
        count: item.resultCount,
      }));

    suggestions.push(...historyMatches);

    // 上下文建议
    const contextMatches = data.contexts
      .filter((context) => context.name.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map((context) => ({
        text: `@${context.name}`,
        type: 'context' as const,
      }));

    suggestions.push(...contextMatches);

    // 项目建议
    const projectMatches = data.projects
      .filter((project) => project.title.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map((project) => ({
        text: `#${project.title}`,
        type: 'project' as const,
      }));

    suggestions.push(...projectMatches);

    // 标签建议
    const tagMatches = data.tags
      .filter((tag) => tag.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map((tag) => ({
        text: `#${tag}`,
        type: 'tag' as const,
      }));

    suggestions.push(...tagMatches);

    return suggestions.slice(0, 10);
  }

  /**
   * 添加到搜索历史
   */
  private addToHistory(query: string, resultCount: number) {
    // 移除重复的查询
    const existingIndex = this.searchHistory.findIndex(
      (item) => item.query === query
    );
    if (existingIndex !== -1) {
      this.searchHistory.splice(existingIndex, 1);
    }

    // 添加新的查询到开头
    this.searchHistory.unshift({
      query,
      timestamp: new Date(),
      resultCount,
    });

    // 限制历史记录数量
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.splice(this.maxHistorySize);
    }

    // 保存到本地存储
    this.saveSearchHistory();
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): SearchHistoryItem[] {
    return [...this.searchHistory];
  }

  /**
   * 清空搜索历史
   */
  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  /**
   * 删除特定的搜索历史项目
   */
  removeFromHistory(query: string) {
    const index = this.searchHistory.findIndex((item) => item.query === query);
    if (index !== -1) {
      this.searchHistory.splice(index, 1);
    }
    this.saveSearchHistory();
  }

  /**
   * 保存搜索历史到本地存储
   */
  private saveSearchHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  /**
   * 从本地存储加载搜索历史
   */
  private loadSearchHistory() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.searchHistory = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  /**
   * 获取热门搜索词
   */
  getPopularSearches(limit = 5): { query: string; count: number }[] {
    const queryCount = new Map<string, number>();

    this.searchHistory.forEach((item) => {
      const count = queryCount.get(item.query) || 0;
      queryCount.set(item.query, count + 1);
    });

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// 导出单例实例
export const searchService = new SearchService();
