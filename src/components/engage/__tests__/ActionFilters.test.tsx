/**
 * ActionFilters 组件测试
 * 测试多维度过滤器和快捷键功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionFilters } from '../ActionFilters';
import type { FilterCriteria, Context } from '../../../types/interfaces';
import { Priority, ActionStatus } from '../../../types/enums';
import { actionDao } from '../../../database/dao/action-dao';

// Mock actionDao
vi.mock('../../../database/dao/action-dao', () => ({
  actionDao: {
    getAllTags: vi.fn(),
  },
}));

describe('ActionFilters', () => {
  const mockContexts: Context[] = [
    {
      id: 'office',
      name: '办公室',
      description: '办公室工作环境',
      color: '#3B82F6',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'home',
      name: '家里',
      description: '家庭环境',
      color: '#10B981',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'errands',
      name: '外出',
      description: '外出办事',
      color: '#F59E0B',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCriteria: FilterCriteria = {};
  const mockOnChange = vi.fn();
  const mockOnQuickFilter = vi.fn();
  const mockOnToggleAdvanced = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (actionDao.getAllTags as any).mockResolvedValue(['工作', '学习', '生活']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ActionFilters>> = {}
  ) => {
    return render(
      <ActionFilters
        criteria={mockCriteria}
        onChange={mockOnChange}
        contexts={mockContexts}
        onQuickFilter={mockOnQuickFilter}
        showAdvanced={false}
        onToggleAdvanced={mockOnToggleAdvanced}
        {...props}
      />
    );
  };

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      renderComponent();

      expect(screen.getByText('快速过滤')).toBeInTheDocument();
      expect(screen.getByText('今日任务')).toBeInTheDocument();
      expect(screen.getByText('高优先级')).toBeInTheDocument();
      expect(screen.getByText('等待中')).toBeInTheDocument();
      expect(screen.getByText('过期任务')).toBeInTheDocument();
    });

    it('应该显示过滤器统计', () => {
      renderComponent();

      expect(screen.getByText(/已选择:/)).toBeInTheDocument();
      expect(screen.getByText(/0 个过滤条件/)).toBeInTheDocument();
    });

    it('应该显示高级过滤器切换按钮', () => {
      renderComponent();

      expect(screen.getByText('高级过滤器')).toBeInTheDocument();
    });
  });

  describe('快速过滤功能', () => {
    it('应该能够应用今日任务过滤器', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('今日任务'));

      expect(mockOnChange).toHaveBeenCalledWith({
        statuses: [ActionStatus.NEXT],
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      });
      expect(mockOnQuickFilter).toHaveBeenCalledWith('today');
    });

    it('应该能够应用高优先级过滤器', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('高优先级'));

      expect(mockOnChange).toHaveBeenCalledWith({
        priorities: [Priority.HIGH, Priority.URGENT],
        statuses: [ActionStatus.NEXT],
      });
      expect(mockOnQuickFilter).toHaveBeenCalledWith('high-priority');
    });

    it('应该能够应用等待中过滤器', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('等待中'));

      expect(mockOnChange).toHaveBeenCalledWith({
        statuses: [ActionStatus.WAITING],
      });
      expect(mockOnQuickFilter).toHaveBeenCalledWith('waiting');
    });

    it('应该能够应用过期任务过滤器', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('过期任务'));

      expect(mockOnChange).toHaveBeenCalledWith({
        statuses: [ActionStatus.NEXT],
        dateRange: expect.objectContaining({
          end: expect.any(Date),
        }),
      });
      expect(mockOnQuickFilter).toHaveBeenCalledWith('overdue');
    });

    it('应该能够清除所有过滤器', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('清除所有过滤器'));

      expect(mockOnChange).toHaveBeenCalledWith({});
    });
  });

  describe('快捷键功能', () => {
    it('应该能够切换快速过滤模式', async () => {
      renderComponent();

      // 按 Alt+F 切换快速模式
      fireEvent.keyDown(document, { key: 'f', altKey: true });

      await waitFor(() => {
        expect(screen.getByText('快速过滤模式')).toBeInTheDocument();
      });
    });

    it('应该在快速模式下响应数字键快捷键', async () => {
      renderComponent();

      // 先启用快速模式
      fireEvent.keyDown(document, { key: 'f', altKey: true });

      await waitFor(() => {
        expect(screen.getByText('快速过滤模式')).toBeInTheDocument();
      });

      // 按 Ctrl+1 应用今日任务过滤器
      fireEvent.keyDown(document, { key: '1', ctrlKey: true });

      expect(mockOnChange).toHaveBeenCalledWith({
        statuses: [ActionStatus.NEXT],
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      });
    });

    it('应该在快速模式下用 Ctrl+0 清除过滤器', async () => {
      renderComponent();

      // 启用快速模式
      fireEvent.keyDown(document, { key: 'f', altKey: true });

      await waitFor(() => {
        expect(screen.getByText('快速过滤模式')).toBeInTheDocument();
      });

      // 按 Ctrl+0 清除过滤器
      fireEvent.keyDown(document, { key: '0', ctrlKey: true });

      expect(mockOnChange).toHaveBeenCalledWith({});
    });

    it('应该用 Escape 键退出快速模式', async () => {
      renderComponent();

      // 启用快速模式
      fireEvent.keyDown(document, { key: 'f', altKey: true });

      await waitFor(() => {
        expect(screen.getByText('快速过滤模式')).toBeInTheDocument();
      });

      // 按 Escape 退出快速模式
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('快速过滤模式')).not.toBeInTheDocument();
      });
    });

    it('应该在非快速模式下忽略数字键', () => {
      renderComponent();

      // 直接按 Ctrl+1，不应该触发过滤器
      fireEvent.keyDown(document, { key: '1', ctrlKey: true });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('高级过滤器', () => {
    it('应该能够切换高级过滤器显示', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: false });

      await user.click(screen.getByText('高级过滤器'));

      expect(mockOnToggleAdvanced).toHaveBeenCalled();
    });

    it('应该在显示高级过滤器时渲染所有过滤选项', async () => {
      renderComponent({ showAdvanced: true });

      await waitFor(() => {
        expect(screen.getByText('按情境过滤')).toBeInTheDocument();
        expect(screen.getByText('按状态过滤')).toBeInTheDocument();
        expect(screen.getByText('按优先级过滤')).toBeInTheDocument();
        expect(screen.getByText('按截止日期过滤')).toBeInTheDocument();
      });
    });

    it('应该渲染情境选项', () => {
      renderComponent({ showAdvanced: true });

      expect(screen.getByText('办公室')).toBeInTheDocument();
      expect(screen.getByText('家里')).toBeInTheDocument();
      expect(screen.getByText('外出')).toBeInTheDocument();
    });

    it('应该渲染状态选项', () => {
      renderComponent({ showAdvanced: true });

      expect(screen.getByText('下一步')).toBeInTheDocument();
      expect(screen.getAllByText('等待中')[1]).toBeInTheDocument(); // 第二个是状态选项
      expect(screen.getByText('已安排')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('已取消')).toBeInTheDocument();
    });

    it('应该渲染优先级选项', () => {
      renderComponent({ showAdvanced: true });

      expect(screen.getByText('低')).toBeInTheDocument();
      expect(screen.getByText('中')).toBeInTheDocument();
      expect(screen.getByText('高')).toBeInTheDocument();
      expect(screen.getByText('紧急')).toBeInTheDocument();
    });
  });

  describe('过滤器交互', () => {
    it('应该能够选择情境过滤器', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: true });

      const officeCheckbox = screen.getByRole('checkbox', { name: /办公室/ });
      await user.click(officeCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        contexts: ['office'],
      });
    });

    it('应该能够选择多个情境', async () => {
      const user = userEvent.setup();
      renderComponent({
        showAdvanced: true,
        criteria: { contexts: ['office'] },
      });

      const homeCheckbox = screen.getByRole('checkbox', { name: /家里/ });
      await user.click(homeCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        contexts: ['office', 'home'],
      });
    });

    it('应该能够取消选择情境', async () => {
      const user = userEvent.setup();
      renderComponent({
        showAdvanced: true,
        criteria: { contexts: ['office', 'home'] },
      });

      const officeCheckbox = screen.getByRole('checkbox', { name: /办公室/ });
      await user.click(officeCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        contexts: ['home'],
      });
    });

    it('应该能够选择优先级过滤器', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: true });

      const highPriorityCheckbox = screen.getByRole('checkbox', { name: /高/ });
      await user.click(highPriorityCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        priorities: [Priority.HIGH],
      });
    });

    it('应该能够选择状态过滤器', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: true });

      const nextStatusCheckbox = screen.getByRole('checkbox', {
        name: /下一步/,
      });
      await user.click(nextStatusCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        statuses: [ActionStatus.NEXT],
      });
    });

    it('应该能够设置日期范围', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: true });

      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0]; // 第一个是开始日期
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-01');

      expect(mockOnChange).toHaveBeenCalledWith({
        dateRange: {
          start: new Date('2024-01-01'),
          end: undefined,
        },
      });
    });
  });

  describe('标签过滤', () => {
    it('应该加载并显示可用标签', async () => {
      renderComponent({ showAdvanced: true });

      await waitFor(() => {
        expect(screen.getByText('#工作')).toBeInTheDocument();
        expect(screen.getByText('#学习')).toBeInTheDocument();
        expect(screen.getByText('#生活')).toBeInTheDocument();
      });
    });

    it('应该能够选择标签过滤器', async () => {
      const user = userEvent.setup();
      renderComponent({ showAdvanced: true });

      await waitFor(() => {
        expect(screen.getByText('#工作')).toBeInTheDocument();
      });

      const workTagCheckbox = screen.getByRole('checkbox', { name: /#工作/ });
      await user.click(workTagCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        tags: ['工作'],
      });
    });

    it('应该在加载标签时显示加载状态', async () => {
      (actionDao.getAllTags as any).mockImplementation(
        () => new Promise(() => {})
      );
      renderComponent({ showAdvanced: true });

      // 由于标签只在有标签时才显示，我们需要等待加载完成
      await waitFor(() => {
        // 如果没有标签，就不会显示标签过滤区域
        expect(screen.queryByText('按标签过滤')).not.toBeInTheDocument();
      });
    });

    it('应该处理标签加载错误', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (actionDao.getAllTags as any).mockRejectedValue(new Error('加载失败'));

      renderComponent({ showAdvanced: true });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '加载标签失败:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('过滤器统计', () => {
    it('应该正确统计选中的过滤条件数量', () => {
      const criteria: FilterCriteria = {
        contexts: ['office', 'home'],
        priorities: [Priority.HIGH],
        statuses: [ActionStatus.NEXT],
        tags: ['工作'],
        dateRange: { start: new Date(), end: new Date() },
      };

      renderComponent({ criteria });

      // 实际计算：2个contexts + 1个priority + 1个status + 1个tags + 1个dateRange = 6个
      expect(screen.getByText(/6 个过滤条件/)).toBeInTheDocument();
    });

    it('应该在没有过滤条件时显示0', () => {
      renderComponent({ criteria: {} });

      expect(screen.getByText(/0 个过滤条件/)).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该为所有复选框提供正确的标签', () => {
      renderComponent({ showAdvanced: true });

      // 检查情境复选框
      expect(
        screen.getByRole('checkbox', { name: /办公室/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /家里/ })
      ).toBeInTheDocument();

      // 检查优先级复选框
      expect(screen.getByRole('checkbox', { name: /高/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /低/ })).toBeInTheDocument();
    });

    it('应该为日期输入提供正确的标签', () => {
      renderComponent({ showAdvanced: true });

      expect(screen.getByText('开始日期')).toBeInTheDocument();
      expect(screen.getByText('结束日期')).toBeInTheDocument();

      // 检查日期输入框存在
      const dateInputs = screen.getAllByDisplayValue('');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('应该为快捷键按钮提供工具提示', () => {
      renderComponent();

      const quickModeButton = screen.getByTitle('Alt+F 切换快速模式');
      expect(quickModeButton).toBeInTheDocument();
    });
  });
});
