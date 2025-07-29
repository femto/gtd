/**
 * 组织功能集成测试
 * 测试等待列表、日程视图和情境分类功能的集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WaitingList } from '../WaitingList';
import { ScheduleView } from '../ScheduleView';
import { ContextualActionList } from '../ContextualActionList';
import { useGTDStore } from '../../../store/gtd-store';
import { ActionStatus } from '../../../types/enums';
import type {
  WaitingItem,
  CalendarItem,
  Action,
  Context,
} from '../../../types/interfaces';

// Mock the store
vi.mock('../../../store/gtd-store');

const mockUseGTDStore = vi.mocked(useGTDStore);

describe('Organize Integration Tests', () => {
  const mockContexts: Context[] = [
    {
      id: 'context1',
      name: '办公室',
      description: '在办公室完成的任务',
      color: '#3B82F6',
      icon: '🏢',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'context2',
      name: '家里',
      description: '在家里完成的任务',
      color: '#EF4444',
      icon: '🏠',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockActions: Action[] = [
    {
      id: 'action1',
      title: '完成报告',
      description: '完成月度工作报告',
      contextId: 'context1',
      priority: 'high' as any,
      status: ActionStatus.NEXT,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天到期
    },
    {
      id: 'action2',
      title: '整理房间',
      description: '清理和整理卧室',
      contextId: 'context2',
      priority: 'medium' as any,
      status: ActionStatus.NEXT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockWaitingItems: WaitingItem[] = [
    {
      id: 'waiting1',
      title: '等待客户反馈',
      description: '等待客户对提案的反馈',
      waitingFor: '张三',
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后跟进
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'waiting2',
      title: '等待设备维修',
      description: '等待IT部门修复打印机',
      waitingFor: 'IT部门',
      followUpDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天应该跟进（过期）
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCalendarItems: CalendarItem[] = [
    {
      id: 'calendar1',
      title: '团队会议',
      description: '每周团队同步会议',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3小时后
      isAllDay: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockStore = {
    contexts: mockContexts,
    actions: mockActions,
    waitingItems: mockWaitingItems,
    calendarItems: mockCalendarItems,
    updateAction: vi.fn(),
    updateWaitingItem: vi.fn(),
    updateCalendarItem: vi.fn(),
    deleteWaitingItem: vi.fn(),
    deleteCalendarItem: vi.fn(),
    deleteAction: vi.fn(),
    organizeError: null,
    clearOrganizeError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGTDStore.mockReturnValue(mockStore as any);
  });

  describe('WaitingList', () => {
    it('应该显示等待项目列表', () => {
      render(<WaitingList />);

      expect(screen.getAllByText('等待客户反馈')).toHaveLength(2); // 在提醒和列表中都会显示
      expect(screen.getAllByText('等待设备维修')).toHaveLength(2); // 在提醒和列表中都会显示
      expect(screen.getByText('共 2 个等待项目')).toBeInTheDocument();
    });

    it('应该显示过期提醒', () => {
      render(<WaitingList />);

      expect(screen.getByText('⚠️ 需要跟进 (1 项)')).toBeInTheDocument();
      expect(screen.getAllByText('等待设备维修')).toHaveLength(2); // 在提醒和列表中都会显示
    });

    it('应该支持排序功能', () => {
      render(<WaitingList />);

      const sortSelect = screen.getByDisplayValue('创建时间');
      expect(sortSelect).toBeInTheDocument();

      fireEvent.change(sortSelect, { target: { value: 'title' } });
      expect(sortSelect).toHaveValue('title');
    });

    it('应该支持标记跟进功能', () => {
      render(<WaitingList />);

      const followUpButtons = screen.getAllByText('✓ 跟进');
      expect(followUpButtons.length).toBeGreaterThan(0);

      fireEvent.click(followUpButtons[0]);
      expect(mockStore.updateWaitingItem).toHaveBeenCalled();
    });
  });

  describe('ScheduleView', () => {
    it('应该显示日程视图', () => {
      render(<ScheduleView />);

      expect(screen.getByText('← 上周')).toBeInTheDocument();
      expect(screen.getByText('今天')).toBeInTheDocument();
      expect(screen.getByText('下周 →')).toBeInTheDocument();
    });

    it('应该支持视图模式切换', () => {
      render(<ScheduleView />);

      const viewSelect = screen.getByDisplayValue('周视图');
      expect(viewSelect).toBeInTheDocument();

      fireEvent.change(viewSelect, { target: { value: 'day' } });
      expect(viewSelect).toHaveValue('day');
    });

    it('应该显示统计信息', () => {
      render(<ScheduleView />);

      expect(screen.getByText('本周统计')).toBeInTheDocument();
      expect(screen.getByText('日程项目')).toBeInTheDocument();
      expect(screen.getByText('已安排任务')).toBeInTheDocument();
      expect(screen.getByText('到期任务')).toBeInTheDocument();
    });
  });

  describe('ContextualActionList', () => {
    it('应该按情境分组显示行动', () => {
      render(<ContextualActionList />);

      expect(screen.getByText('办公室')).toBeInTheDocument();
      expect(screen.getByText('家里')).toBeInTheDocument();
      expect(screen.getByText('共 2 个待办事项')).toBeInTheDocument();
    });

    it('应该显示行动详情', () => {
      render(<ContextualActionList />);

      expect(screen.getByText('完成报告')).toBeInTheDocument();
      expect(screen.getByText('整理房间')).toBeInTheDocument();
    });

    it('应该支持排序功能', () => {
      render(<ContextualActionList />);

      const sortSelect = screen.getByDisplayValue('优先级');
      expect(sortSelect).toBeInTheDocument();

      fireEvent.change(sortSelect, { target: { value: 'date' } });
      expect(sortSelect).toHaveValue('date');
    });

    it('应该支持完成行动', () => {
      render(<ContextualActionList />);

      const completeButtons = screen.getAllByText('✓');
      expect(completeButtons.length).toBeGreaterThan(0);

      fireEvent.click(completeButtons[0]);
      expect(mockStore.updateAction).toHaveBeenCalledWith(
        'action1',
        expect.objectContaining({
          status: ActionStatus.COMPLETED,
          completedAt: expect.any(Date),
        })
      );
    });

    it('应该显示优先级标签', () => {
      render(<ContextualActionList />);

      expect(screen.getByText('高')).toBeInTheDocument(); // 高优先级
      expect(screen.getByText('中')).toBeInTheDocument(); // 中优先级
    });
  });

  describe('错误处理', () => {
    it('WaitingList应该显示错误信息', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        organizeError: '加载等待项目失败',
      } as any);

      render(<WaitingList />);

      expect(screen.getByText('加载等待项目失败')).toBeInTheDocument();
    });

    it('ScheduleView应该显示错误信息', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        organizeError: '加载日程失败',
      } as any);

      render(<ScheduleView />);

      expect(screen.getByText('加载日程失败')).toBeInTheDocument();
    });

    it('ContextualActionList应该显示错误信息', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        organizeError: '加载行动失败',
      } as any);

      render(<ContextualActionList />);

      expect(screen.getByText('加载行动失败')).toBeInTheDocument();
    });
  });

  describe('空状态处理', () => {
    it('WaitingList应该显示空状态', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        waitingItems: [],
      } as any);

      render(<WaitingList />);

      expect(screen.getByText('暂无等待项目')).toBeInTheDocument();
      expect(
        screen.getByText('当您委派任务给他人时，这里会显示等待跟进的项目')
      ).toBeInTheDocument();
    });

    it('ContextualActionList应该显示空状态', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        actions: [],
      } as any);

      render(<ContextualActionList />);

      expect(screen.getByText('暂无待办事项')).toBeInTheDocument();
      expect(
        screen.getByText('所有任务都已完成，或者还没有创建任务')
      ).toBeInTheDocument();
    });
  });
});
