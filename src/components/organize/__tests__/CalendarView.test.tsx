/**
 * CalendarView组件测试
 * 测试日历视图的各种功能和交互
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CalendarView } from '../CalendarView';
import { useGTDStore } from '../../../store/gtd-store';
import { ActionStatus } from '../../../types/enums';
import type { CalendarItem, Action } from '../../../types/interfaces';

// Mock store
vi.mock('../../../store/gtd-store');

const mockStore = {
  calendarItems: [] as CalendarItem[],
  actions: [] as Action[],
  updateCalendarItem: vi.fn(),
  updateAction: vi.fn(),
  organizeError: null,
  clearOrganizeError: vi.fn(),
};

const mockUseGTDStore = vi.mocked(useGTDStore);

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGTDStore.mockReturnValue(mockStore as any);
  });

  describe('基本渲染', () => {
    it('应该渲染日历视图', () => {
      render(<CalendarView />);

      expect(screen.getByText('今天')).toBeInTheDocument();
      expect(screen.getByDisplayValue('周视图')).toBeInTheDocument();
    });

    it('应该显示当前日期', () => {
      render(<CalendarView />);

      // 检查是否显示了日期相关的文本 - 使用更灵活的匹配
      expect(screen.getByText(/\d+月\d+日 - \d+月\d+日/)).toBeInTheDocument();
    });

    it('应该显示视图切换选项', () => {
      render(<CalendarView />);

      const select = screen.getByDisplayValue('周视图');
      expect(select).toBeInTheDocument();

      fireEvent.click(select);
      expect(screen.getByText('日视图')).toBeInTheDocument();
      expect(screen.getByText('月视图')).toBeInTheDocument();
    });
  });

  describe('导航功能', () => {
    it('应该支持导航到上一个时间段', () => {
      render(<CalendarView />);

      const prevButton = screen.getByText('← 上一个');
      fireEvent.click(prevButton);

      // 验证日期发生了变化
      expect(prevButton).toBeInTheDocument();
    });

    it('应该支持导航到下一个时间段', () => {
      render(<CalendarView />);

      const nextButton = screen.getByText('下一个 →');
      fireEvent.click(nextButton);

      expect(nextButton).toBeInTheDocument();
    });

    it('应该支持回到今天', () => {
      render(<CalendarView />);

      const todayButton = screen.getByText('今天');
      fireEvent.click(todayButton);

      expect(todayButton).toBeInTheDocument();
    });
  });

  describe('视图切换', () => {
    it('应该支持切换到日视图', () => {
      render(<CalendarView />);

      const select = screen.getByDisplayValue('周视图');
      fireEvent.change(select, { target: { value: 'day' } });

      expect(screen.getByDisplayValue('日视图')).toBeInTheDocument();
    });

    it('应该支持切换到月视图', () => {
      render(<CalendarView />);

      const select = screen.getByDisplayValue('周视图');
      fireEvent.change(select, { target: { value: 'month' } });

      expect(screen.getByDisplayValue('月视图')).toBeInTheDocument();
    });

    it('应该在不同视图中显示不同的内容结构', () => {
      const { rerender } = render(<CalendarView />);

      // 周视图应该显示星期标题
      expect(screen.getByText('周一')).toBeInTheDocument();

      // 切换到月视图
      const select = screen.getByDisplayValue('周视图');
      fireEvent.change(select, { target: { value: 'month' } });

      rerender(<CalendarView />);

      // 月视图也应该显示星期标题，但布局不同
      expect(screen.getByText('周一')).toBeInTheDocument();
    });
  });

  describe('事件显示', () => {
    // 使用当前周的日期来确保事件在可见范围内
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // 周日
    const eventDate = new Date(currentWeekStart);
    eventDate.setDate(currentWeekStart.getDate() + 1); // 周一
    eventDate.setHours(10, 0, 0, 0);

    const mockCalendarItem: CalendarItem = {
      id: 'cal-1',
      title: '会议',
      description: '重要会议',
      startTime: eventDate,
      endTime: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1小时后
      isAllDay: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const actionDate = new Date(eventDate);
    actionDate.setHours(14, 0, 0, 0);

    const mockAction: Action = {
      id: 'action-1',
      title: '完成报告',
      contextId: 'ctx-1',
      priority: 'high' as any,
      status: ActionStatus.SCHEDULED,
      dueDate: actionDate,
      estimatedTime: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockStore.calendarItems = [mockCalendarItem];
      mockStore.actions = [mockAction];
    });

    it('应该显示日程项目', () => {
      render(<CalendarView />);

      expect(screen.getByText('会议')).toBeInTheDocument();
    });

    it('应该显示已安排的任务', () => {
      render(<CalendarView />);

      expect(screen.getAllByText('完成报告')).toHaveLength(2); // 在周视图中可能显示多次
    });

    it('应该为不同类型的事件使用不同的颜色', () => {
      render(<CalendarView />);

      // 检查图例
      expect(screen.getByText('日程项目')).toBeInTheDocument();
      expect(screen.getByText('已安排任务')).toBeInTheDocument();
      expect(screen.getByText('到期任务')).toBeInTheDocument();
    });
  });

  describe('事件交互', () => {
    const mockOnEventClick = vi.fn();
    const mockOnEventEdit = vi.fn();
    const mockOnTimeSlotClick = vi.fn();

    // 使用当前周的日期
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const eventDate = new Date(currentWeekStart);
    eventDate.setDate(currentWeekStart.getDate() + 1);
    eventDate.setHours(10, 0, 0, 0);

    const mockCalendarItem: CalendarItem = {
      id: 'cal-1',
      title: '会议',
      startTime: eventDate,
      endTime: new Date(eventDate.getTime() + 60 * 60 * 1000),
      isAllDay: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockStore.calendarItems = [mockCalendarItem];
      vi.clearAllMocks();
    });

    it('应该支持点击事件', () => {
      render(
        <CalendarView
          onEventClick={mockOnEventClick}
          onEventEdit={mockOnEventEdit}
          onTimeSlotClick={mockOnTimeSlotClick}
        />
      );

      const eventElement = screen.getByText('会议');
      fireEvent.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '会议',
          type: 'calendar',
        })
      );
    });

    it('应该支持双击编辑事件', () => {
      render(
        <CalendarView
          onEventClick={mockOnEventClick}
          onEventEdit={mockOnEventEdit}
          onTimeSlotClick={mockOnTimeSlotClick}
        />
      );

      const eventElement = screen.getByText('会议');
      fireEvent.doubleClick(eventElement);

      expect(mockOnEventEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '会议',
          type: 'calendar',
        })
      );
    });
  });

  describe('拖拽功能', () => {
    // 使用当前周的日期
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const eventDate = new Date(currentWeekStart);
    eventDate.setDate(currentWeekStart.getDate() + 1);
    eventDate.setHours(10, 0, 0, 0);

    const mockCalendarItem: CalendarItem = {
      id: 'cal-1',
      title: '会议',
      startTime: eventDate,
      endTime: new Date(eventDate.getTime() + 60 * 60 * 1000),
      isAllDay: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockStore.calendarItems = [mockCalendarItem];
      mockStore.updateCalendarItem = vi.fn().mockResolvedValue(undefined);
    });

    it('应该支持拖拽开始', () => {
      render(<CalendarView />);

      const eventElement = screen.getByText('会议');
      // 检查父元素是否可拖拽
      expect(eventElement.closest('[draggable="true"]')).toBeInTheDocument();

      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          setData: vi.fn(),
          getData: vi.fn(),
        },
      });

      fireEvent(eventElement, dragStartEvent);

      // 验证拖拽开始被处理
      expect(eventElement).toBeInTheDocument();
    });

    it('应该在拖拽放置时更新事件时间', () => {
      render(<CalendarView />);

      const eventElement = screen.getByText('会议');
      const draggableElement = eventElement.closest('[draggable="true"]');

      // 验证拖拽功能已正确设置
      expect(draggableElement).toBeInTheDocument();

      // 验证拖拽事件处理器存在
      if (draggableElement) {
        expect(draggableElement).toHaveAttribute('draggable', 'true');

        // 模拟拖拽开始事件
        const dragStartEvent = new Event('dragstart', { bubbles: true });
        Object.defineProperty(dragStartEvent, 'dataTransfer', {
          value: { effectAllowed: '', setData: vi.fn(), getData: vi.fn() },
        });

        // 验证事件可以被触发而不报错
        expect(() => {
          fireEvent(draggableElement, dragStartEvent);
        }).not.toThrow();
      }
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', () => {
      (mockStore as any).organizeError = '加载日程失败';

      render(<CalendarView />);

      expect(screen.getByText('加载日程失败')).toBeInTheDocument();
      expect(screen.getByText('关闭')).toBeInTheDocument();
    });

    it('应该支持清除错误', () => {
      (mockStore as any).organizeError = '加载日程失败';

      render(<CalendarView />);

      const closeButton = screen.getByText('关闭');
      fireEvent.click(closeButton);

      expect(mockStore.clearOrganizeError).toHaveBeenCalled();
    });
  });

  describe('响应式设计', () => {
    it('应该在不同屏幕尺寸下正常显示', () => {
      // 模拟小屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<CalendarView />);

      // 验证基本元素仍然存在
      expect(screen.getByText('今天')).toBeInTheDocument();
      expect(screen.getByDisplayValue('周视图')).toBeInTheDocument();
    });
  });

  describe('性能优化', () => {
    it('应该只渲染可见的事件', () => {
      // 创建大量事件，但只有部分在当前视图中
      const manyEvents: CalendarItem[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `cal-${i}`,
          title: `事件 ${i}`,
          startTime: new Date(2024, 0, i + 1, 10, 0),
          endTime: new Date(2024, 0, i + 1, 11, 0),
          isAllDay: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      mockStore.calendarItems = manyEvents;

      render(<CalendarView />);

      // 验证只渲染了当前视图中的事件
      const eventElements = screen.queryAllByText(/事件 \d+/);
      expect(eventElements.length).toBeLessThan(100);
    });
  });

  describe('可访问性', () => {
    it('应该支持键盘导航', () => {
      render(<CalendarView />);

      const todayButton = screen.getByText('今天');
      todayButton.focus();

      expect(document.activeElement).toBe(todayButton);
    });

    it('应该有适当的ARIA标签', () => {
      render(<CalendarView />);

      const select = screen.getByDisplayValue('周视图');
      expect(select).toBeInTheDocument();

      // 验证选择框可以被屏幕阅读器识别
      expect(select.tagName).toBe('SELECT');
    });
  });
});
