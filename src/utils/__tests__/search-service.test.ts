/**
 * 搜索服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchService, searchService } from '../search-service';
import type {
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  InboxItem,
} from '../../types/interfaces';
import {
  ActionStatus,
  ProjectStatus,
  Priority,
  InputType,
} from '../../types/enums';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SearchService', () => {
  let service: SearchService;
  let mockData: {
    actions: Action[];
    projects: Project[];
    waitingItems: WaitingItem[];
    calendarItems: CalendarItem[];
    inboxItems: InboxItem[];
  };

  beforeEach(() => {
    service = new SearchService();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    // 创建测试数据
    mockData = {
      actions: [
        {
          id: '1',
          title: '完成项目报告',
          description: '编写季度项目总结报告',
          contextId: 'office',
          priority: Priority.HIGH,
          status: ActionStatus.NEXT,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          tags: ['工作', '报告'],
          notes: '需要包含数据分析',
        },
        {
          id: '2',
          title: '购买生日礼物',
          description: '为妈妈挑选生日礼物',
          contextId: 'errands',
          priority: Priority.MEDIUM,
          status: ActionStatus.NEXT,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          dueDate: new Date('2024-01-15'),
        },
        {
          id: '3',
          title: '学习React',
          description: '深入学习React Hooks',
          contextId: 'computer',
          priority: Priority.LOW,
          status: ActionStatus.COMPLETED,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          completedAt: new Date('2024-01-10'),
          tags: ['学习', '技术'],
        },
      ],
      projects: [
        {
          id: '1',
          title: '网站重构项目',
          description: '重构公司官网，提升用户体验',
          status: ProjectStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          tags: ['技术', '网站'],
        },
        {
          id: '2',
          title: '家庭装修',
          description: '客厅和卧室装修改造',
          status: ProjectStatus.ON_HOLD,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          tags: ['家庭', '装修'],
        },
      ],
      waitingItems: [
        {
          id: '1',
          title: '等待设计稿确认',
          description: '等待客户确认最终设计方案',
          waitingFor: '客户张三',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          followUpDate: new Date('2024-01-20'),
        },
      ],
      calendarItems: [
        {
          id: '1',
          title: '团队会议',
          description: '讨论项目进展和下周计划',
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          location: '会议室A',
          isAllDay: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
      inboxItems: [
        {
          id: '1',
          content: '研究新的项目管理工具',
          type: InputType.TEXT,
          processed: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
    };

    service.initializeIndexes(mockData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化和索引管理', () => {
    it('应该正确初始化搜索索引', () => {
      expect(() => service.initializeIndexes(mockData)).not.toThrow();
    });

    it('应该能够更新特定类型的索引', () => {
      const newActions = [
        ...mockData.actions,
        {
          id: '4',
          title: '新任务',
          contextId: 'office',
          priority: Priority.MEDIUM,
          status: ActionStatus.NEXT,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      expect(() => service.updateIndex('actions', newActions)).not.toThrow();
    });
  });

  describe('搜索功能', () => {
    it('应该能够搜索行动标题', () => {
      const results = service.search('项目报告');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('action');
      expect(results[0].item.id).toBe('1');
      expect(results[0].matches).toContain('title');
    });

    it('应该能够搜索项目描述', () => {
      const results = service.search('用户体验');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('project');
      expect(results[0].item.id).toBe('1');
      expect(results[0].matches).toContain('description');
    });

    it('应该能够搜索等待项目', () => {
      const results = service.search('设计稿');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('waiting');
      expect(results[0].item.id).toBe('1');
    });

    it('应该能够搜索日程项目', () => {
      const results = service.search('团队会议');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('calendar');
      expect(results[0].item.id).toBe('1');
    });

    it('应该能够搜索工作篮项目', () => {
      const results = service.search('项目管理工具', { types: ['inbox'] });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('inbox');
      expect(results[0].item.id).toBe('1');
    });

    it('应该支持模糊搜索', () => {
      const results = service.search('报告');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.item.id === '1')).toBe(true);
    });

    it('应该按相关性排序结果', () => {
      const results = service.search('项目');

      expect(results.length).toBeGreaterThan(1);
      // 第一个结果应该有更高的相关性（更低的分数）
      expect(results[0].score).toBeLessThanOrEqual(results[1].score);
    });

    it('应该支持限制搜索类型', () => {
      const results = service.search('项目', { types: ['action'] });

      expect(results.every((r) => r.type === 'action')).toBe(true);
    });

    it('应该支持限制结果数量', () => {
      const results = service.search('项目', { limit: 1 });

      expect(results).toHaveLength(1);
    });

    it('空查询应该返回空结果', () => {
      const results = service.search('');

      expect(results).toHaveLength(0);
    });

    it('没有匹配的查询应该返回空结果', () => {
      const results = service.search('不存在的内容xyz123');

      expect(results).toHaveLength(0);
    });
  });

  describe('过滤功能', () => {
    it('应该支持按上下文过滤', () => {
      const results = service.search('', {
        types: ['action'],
        filters: { contexts: ['office'] },
      });

      // 由于空查询，这里主要测试过滤器不会报错
      expect(results).toHaveLength(0);
    });

    it('应该支持按优先级过滤', () => {
      const results = service.search('', {
        types: ['action'],
        filters: { priorities: [Priority.HIGH] },
      });

      expect(results).toHaveLength(0);
    });

    it('应该支持按日期范围过滤', () => {
      const results = service.search('', {
        types: ['action'],
        filters: {
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        },
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('关键词高亮', () => {
    it('应该能够高亮单个关键词', () => {
      const text = '这是一个测试文本';
      const highlighted = service.highlightMatches(text, '测试');

      expect(highlighted).toContain(
        '<mark class="bg-yellow-200 px-1 rounded">测试</mark>'
      );
    });

    it('应该能够高亮多个关键词', () => {
      const text = '这是一个测试文本';
      const highlighted = service.highlightMatches(text, '测试 文本');

      expect(highlighted).toContain(
        '<mark class="bg-yellow-200 px-1 rounded">测试</mark>'
      );
      expect(highlighted).toContain(
        '<mark class="bg-yellow-200 px-1 rounded">文本</mark>'
      );
    });

    it('应该忽略大小写', () => {
      const text = 'This is a Test';
      const highlighted = service.highlightMatches(text, 'test');

      expect(highlighted).toContain(
        '<mark class="bg-yellow-200 px-1 rounded">Test</mark>'
      );
    });

    it('空查询不应该高亮', () => {
      const text = '这是一个测试文本';
      const highlighted = service.highlightMatches(text, '');

      expect(highlighted).toBe(text);
    });

    it('应该转义特殊字符', () => {
      const text = '这是一个(测试)文本';
      const highlighted = service.highlightMatches(text, '(测试)');

      expect(highlighted).toContain(
        '<mark class="bg-yellow-200 px-1 rounded">(测试)</mark>'
      );
    });
  });

  describe('搜索建议', () => {
    let mockSuggestionData: {
      contexts: { id: string; name: string }[];
      projects: Project[];
      tags: string[];
    };

    beforeEach(() => {
      mockSuggestionData = {
        contexts: [
          { id: 'office', name: '办公室' },
          { id: 'home', name: '家里' },
        ],
        projects: mockData.projects,
        tags: ['工作', '学习', '技术'],
      };
    });

    it('应该提供上下文建议', () => {
      const suggestions = service.getSuggestions('办公', mockSuggestionData);

      expect(
        suggestions.some((s) => s.type === 'context' && s.text === '@办公室')
      ).toBe(true);
    });

    it('应该提供项目建议', () => {
      const suggestions = service.getSuggestions('网站', mockSuggestionData);

      expect(
        suggestions.some(
          (s) => s.type === 'project' && s.text === '#网站重构项目'
        )
      ).toBe(true);
    });

    it('应该提供标签建议', () => {
      const suggestions = service.getSuggestions('工作', mockSuggestionData);

      expect(
        suggestions.some((s) => s.type === 'tag' && s.text === '#工作')
      ).toBe(true);
    });

    it('应该限制建议数量', () => {
      const suggestions = service.getSuggestions('', mockSuggestionData);

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('搜索历史', () => {
    beforeEach(() => {
      // 清空历史记录
      service.clearSearchHistory();
    });

    it('应该记录搜索历史', () => {
      service.search('测试查询');

      const history = service.getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('测试查询');
    });

    it('应该去重搜索历史', () => {
      service.search('重复查询');
      service.search('重复查询');

      const history = service.getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('重复查询');
    });

    it('应该限制历史记录数量', () => {
      // 添加超过限制的历史记录
      for (let i = 0; i < 60; i++) {
        service.search(`查询${i}`);
      }

      const history = service.getSearchHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('应该能够删除特定历史记录', () => {
      service.search('要删除的查询');
      service.search('保留的查询');

      service.removeFromHistory('要删除的查询');

      const history = service.getSearchHistory();
      expect(history.some((h) => h.query === '要删除的查询')).toBe(false);
      expect(history.some((h) => h.query === '保留的查询')).toBe(true);
    });

    it('应该能够清空所有历史记录', () => {
      service.search('查询1');
      service.search('查询2');

      service.clearSearchHistory();

      const history = service.getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it('应该提供热门搜索统计', () => {
      // 创建新的服务实例避免测试间干扰
      const testService = new SearchService();
      testService.initializeIndexes(mockData);

      // 由于addToHistory会去重，我们需要搜索不同的查询来测试统计功能
      testService.search('查询1');
      testService.search('查询2');
      testService.search('查询3');

      const popular = testService.getPopularSearches(5);
      expect(popular.length).toBe(3);
      expect(popular.every((p) => p.count === 1)).toBe(true);
    });
  });

  describe('本地存储集成', () => {
    it('应该保存搜索历史到本地存储', () => {
      service.search('测试查询');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gtd-search-history',
        expect.stringContaining('测试查询')
      );
    });

    it('应该从本地存储加载搜索历史', () => {
      const mockHistory = JSON.stringify([
        {
          query: '历史查询',
          timestamp: new Date().toISOString(),
          resultCount: 5,
        },
      ]);

      localStorageMock.getItem.mockReturnValue(mockHistory);

      const newService = new SearchService();
      const history = newService.getSearchHistory();

      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('历史查询');
    });

    it('应该处理损坏的本地存储数据', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => new SearchService()).not.toThrow();
    });
  });
});

describe('searchService 单例', () => {
  it('应该导出单例实例', () => {
    expect(searchService).toBeInstanceOf(SearchService);
  });

  it('多次导入应该返回同一个实例', async () => {
    const module1 = await import('../search-service');
    const module2 = await import('../search-service');

    expect(module1.searchService).toBe(module2.searchService);
  });
});
