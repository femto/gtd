/**
 * 智能列表服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SmartListService, smartListService } from '../smart-lists';
import type {
  Action,
  Project,
  WaitingItem,
  CalendarItem,
} from '../../types/interfaces';
import { ActionStatus, ProjectStatus, Priority } from '../../types/enums';

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

describe('SmartListService', () => {
  let service: SmartListService;
  let mockData: {
    actions: Action[];
    projects: Project[];
    waitingItems: WaitingItem[];
    calendarItems: CalendarItem[];
  };

  beforeEach(() => {
    service = new SmartListService();
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
          dueDate: new Date('2024-01-15'),
          tags: ['工作', '报告'],
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
          dueDate: new Date('2024-01-20'),
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
        {
          id: '4',
          title: '等待设计确认',
          description: '等待客户确认设计方案',
          contextId: 'office',
          priority: Priority.HIGH,
          status: ActionStatus.WAITING,
          createdAt: new Date('2024-01-04'),
          updatedAt: new Date('2024-01-04'),
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
          status: ProjectStatus.COMPLETED,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          completedAt: new Date('2024-01-15'),
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
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('系统智能列表', () => {
    it('应该包含预定义的系统智能列表', () => {
      const systemLists = service.getSystemLists();

      expect(systemLists.length).toBeGreaterThan(0);
      expect(systemLists.every((list) => list.isSystem)).toBe(true);

      // 检查特定的系统列表
      const todayList = systemLists.find((list) => list.id === 'today');
      expect(todayList).toBeDefined();
      expect(todayList?.name).toBe('今日任务');

      const highPriorityList = systemLists.find(
        (list) => list.id === 'high-priority'
      );
      expect(highPriorityList).toBeDefined();
      expect(highPriorityList?.name).toBe('高优先级');
    });

    it('系统列表应该有正确的过滤条件', () => {
      const systemLists = service.getSystemLists();

      const highPriorityList = systemLists.find(
        (list) => list.id === 'high-priority'
      );
      expect(highPriorityList?.filters.priorities).toEqual([
        Priority.HIGH,
        Priority.URGENT,
      ]);
      expect(highPriorityList?.filters.statuses).toEqual([ActionStatus.NEXT]);

      const waitingList = systemLists.find((list) => list.id === 'waiting');
      expect(waitingList?.filters.statuses).toEqual([ActionStatus.WAITING]);
    });
  });

  describe('过滤功能', () => {
    it('应该能够按上下文过滤行动', () => {
      const filters = { contexts: ['office'] };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions).toHaveLength(2);
      expect(
        result.actions.every((action) => action.contextId === 'office')
      ).toBe(true);
    });

    it('应该能够按优先级过滤行动', () => {
      const filters = { priorities: [Priority.HIGH] };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions).toHaveLength(2);
      expect(
        result.actions.every((action) => action.priority === Priority.HIGH)
      ).toBe(true);
    });

    it('应该能够按状态过滤行动', () => {
      const filters = { statuses: [ActionStatus.COMPLETED] };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    it('应该能够按日期范围过滤行动', () => {
      const filters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-16'),
        },
      };
      const result = service.applyFilters(mockData, filters);

      // 应该包含截止日期在范围内的行动
      expect(result.actions.some((action) => action.id === '1')).toBe(true);
    });

    it('应该能够按标签过滤行动', () => {
      const filters = { tags: ['工作'] };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].tags).toContain('工作');
    });

    it('应该能够按搜索文本过滤行动', () => {
      const filters = { searchText: '项目' };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.projects.length).toBeGreaterThan(0);
    });

    it('应该能够组合多个过滤条件', () => {
      const filters = {
        contexts: ['office'],
        priorities: [Priority.HIGH],
        statuses: [ActionStatus.NEXT],
      };
      const result = service.applyFilters(mockData, filters);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].id).toBe('1');
    });
  });

  describe('过滤器选项生成', () => {
    it('应该生成正确的过滤器选项', () => {
      const contexts = [
        { id: 'office', name: '办公室', color: '#blue' },
        { id: 'home', name: '家里', color: '#green' },
      ];

      const filterGroups = service.generateFilterOptions({
        actions: mockData.actions,
        contexts,
      });

      expect(filterGroups).toHaveLength(5); // contexts, priorities, statuses, tags, dateRange

      // 检查上下文选项
      const contextGroup = filterGroups.find(
        (group) => group.id === 'contexts'
      );
      expect(contextGroup).toBeDefined();
      expect(contextGroup?.options).toHaveLength(2);

      // 检查优先级选项
      const priorityGroup = filterGroups.find(
        (group) => group.id === 'priorities'
      );
      expect(priorityGroup).toBeDefined();
      expect(priorityGroup?.options).toHaveLength(4);

      // 检查状态选项
      const statusGroup = filterGroups.find((group) => group.id === 'statuses');
      expect(statusGroup).toBeDefined();
      expect(statusGroup?.options).toHaveLength(5);
    });

    it('应该包含选项的统计数量', () => {
      const contexts = [
        { id: 'office', name: '办公室', color: '#blue' },
        { id: 'errands', name: '外出', color: '#green' },
        { id: 'computer', name: '电脑', color: '#red' },
      ];

      const filterGroups = service.generateFilterOptions({
        actions: mockData.actions,
        contexts,
      });

      const contextGroup = filterGroups.find(
        (group) => group.id === 'contexts'
      );
      const officeOption = contextGroup?.options.find(
        (option) => option.id === 'office'
      );
      expect(officeOption?.count).toBe(2); // 有2个office上下文的行动
    });
  });

  describe('智能列表管理', () => {
    it('应该能够创建新的智能列表', () => {
      const listData = {
        name: '我的高优先级任务',
        description: '所有高优先级的任务',
        filters: { priorities: [Priority.HIGH] },
        color: '#red',
      };

      const newList = service.createSmartList(listData);

      expect(newList.id).toBeDefined();
      expect(newList.name).toBe(listData.name);
      expect(newList.description).toBe(listData.description);
      expect(newList.filters).toEqual(listData.filters);
      expect(newList.isSystem).toBe(false);
      expect(newList.createdAt).toBeInstanceOf(Date);
      expect(newList.updatedAt).toBeInstanceOf(Date);
    });

    it('应该能够更新智能列表', () => {
      const listData = {
        name: '测试列表',
        filters: { priorities: [Priority.HIGH] },
      };

      const newList = service.createSmartList(listData);
      const updates = {
        name: '更新后的列表',
        description: '新的描述',
      };

      const updatedList = service.updateSmartList(newList.id, updates);

      expect(updatedList).toBeDefined();
      expect(updatedList?.name).toBe(updates.name);
      expect(updatedList?.description).toBe(updates.description);
      expect(updatedList?.updatedAt).toBeInstanceOf(Date);
    });

    it('应该不能更新系统列表', () => {
      const systemLists = service.getSystemLists();
      const systemList = systemLists[0];

      const result = service.updateSmartList(systemList.id, { name: '新名称' });

      expect(result).toBeNull();
    });

    it('应该能够删除用户创建的智能列表', () => {
      const listData = {
        name: '要删除的列表',
        filters: { priorities: [Priority.HIGH] },
      };

      const newList = service.createSmartList(listData);
      const deleted = service.deleteSmartList(newList.id);

      expect(deleted).toBe(true);
      expect(service.getSmartListById(newList.id)).toBeUndefined();
    });

    it('应该不能删除系统列表', () => {
      const systemLists = service.getSystemLists();
      const systemList = systemLists[0];

      const deleted = service.deleteSmartList(systemList.id);

      expect(deleted).toBe(false);
      expect(service.getSmartListById(systemList.id)).toBeDefined();
    });

    it('应该能够复制智能列表', () => {
      const listData = {
        name: '原始列表',
        filters: { priorities: [Priority.HIGH] },
        color: '#blue',
      };

      const originalList = service.createSmartList(listData);
      const duplicatedList = service.duplicateSmartList(
        originalList.id,
        '复制的列表'
      );

      expect(duplicatedList).toBeDefined();
      expect(duplicatedList?.name).toBe('复制的列表');
      expect(duplicatedList?.filters).toEqual(originalList.filters);
      expect(duplicatedList?.color).toBe(originalList.color);
      expect(duplicatedList?.id).not.toBe(originalList.id);
    });

    it('应该能够复制系统列表', () => {
      const systemLists = service.getSystemLists();
      const systemList = systemLists[0];

      const duplicatedList = service.duplicateSmartList(systemList.id);

      expect(duplicatedList).toBeDefined();
      expect(duplicatedList?.name).toBe(`${systemList.name} (副本)`);
      expect(duplicatedList?.isSystem).toBe(false);
    });
  });

  describe('本地存储', () => {
    it('应该保存用户创建的智能列表到本地存储', () => {
      const listData = {
        name: '测试列表',
        filters: { priorities: [Priority.HIGH] },
      };

      service.createSmartList(listData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gtd-smart-lists',
        expect.stringContaining('测试列表')
      );
    });

    it('应该从本地存储加载智能列表', () => {
      const mockLists = [
        {
          id: 'test-1',
          name: '测试列表',
          filters: { priorities: [Priority.HIGH] },
          color: '#blue',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystem: false,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLists));

      const newService = new SmartListService();
      const userLists = newService.getUserLists();

      expect(userLists).toHaveLength(1);
      expect(userLists[0].name).toBe('测试列表');
    });

    it('应该处理损坏的本地存储数据', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => new SmartListService()).not.toThrow();
    });
  });

  describe('获取智能列表', () => {
    it('应该返回所有智能列表', () => {
      const allLists = service.getSmartLists();

      expect(allLists.length).toBeGreaterThan(0);
      expect(allLists.some((list) => list.isSystem)).toBe(true);
    });

    it('应该能够按ID获取智能列表', () => {
      const systemLists = service.getSystemLists();
      const systemList = systemLists[0];

      const foundList = service.getSmartListById(systemList.id);

      expect(foundList).toBeDefined();
      expect(foundList?.id).toBe(systemList.id);
    });

    it('应该返回用户自定义列表', () => {
      const listData = {
        name: '用户列表',
        filters: { priorities: [Priority.HIGH] },
      };

      service.createSmartList(listData);
      const userLists = service.getUserLists();

      expect(userLists).toHaveLength(1);
      expect(userLists[0].name).toBe('用户列表');
      expect(userLists[0].isSystem).toBe(false);
    });
  });
});

describe('smartListService 单例', () => {
  it('应该导出单例实例', () => {
    expect(smartListService).toBeInstanceOf(SmartListService);
  });

  it('多次导入应该返回同一个实例', async () => {
    const module1 = await import('../smart-lists');
    const module2 = await import('../smart-lists');

    expect(module1.smartListService).toBe(module2.smartListService);
  });
});
