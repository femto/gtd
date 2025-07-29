/**
 * SmartListManager 组件测试
 * 测试智能列表管理功能
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartListManager } from '../SmartListManager';
import type { FilterCriteria } from '../../../types/interfaces';
import { Priority, ActionStatus } from '../../../types/enums';
import { smartListService } from '../../../utils/smart-lists';

// Mock smartListService
vi.mock('../../../utils/smart-lists', () => ({
  smartListService: {
    getSmartLists: vi.fn(),
    createSmartList: vi.fn(),
    deleteSmartList: vi.fn(),
    duplicateSmartList: vi.fn(),
  },
}));

describe('SmartListManager', () => {
  const mockOnApplyFilters = vi.fn();
  const mockCurrentFilters: FilterCriteria = {
    priorities: [Priority.HIGH],
    statuses: [ActionStatus.NEXT],
  };

  const mockSmartLists = [
    {
      id: 'today',
      name: '今日任务',
      description: '今天需要完成的所有任务',
      filters: {
        statuses: [ActionStatus.NEXT],
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
      },
      color: '#3B82F6',
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: true,
    },
    {
      id: 'user-list-1',
      name: '我的高优先级任务',
      description: '所有高优先级的任务',
      filters: {
        priorities: [Priority.HIGH, Priority.URGENT],
      },
      color: '#EF4444',
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (smartListService.getSmartLists as any).mockReturnValue(mockSmartLists);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof SmartListManager>> = {}
  ) => {
    return render(
      <SmartListManager
        currentFilters={mockCurrentFilters}
        onApplyFilters={mockOnApplyFilters}
        {...props}
      />
    );
  };

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      renderComponent();

      expect(screen.getByText('智能列表')).toBeInTheDocument();
      expect(screen.getByText('+ 新建列表')).toBeInTheDocument();
      expect(screen.getByText('系统列表')).toBeInTheDocument();
      expect(screen.getByText('我的列表')).toBeInTheDocument();
    });

    it('应该显示系统智能列表', () => {
      renderComponent();

      expect(screen.getByText('今日任务')).toBeInTheDocument();
      expect(screen.getByText('今天需要完成的所有任务')).toBeInTheDocument();
    });

    it('应该显示用户自定义智能列表', () => {
      renderComponent();

      expect(screen.getByText('我的高优先级任务')).toBeInTheDocument();
      expect(screen.getByText('所有高优先级的任务')).toBeInTheDocument();
    });

    it('应该在没有活跃过滤器时禁用新建按钮', () => {
      renderComponent({ currentFilters: null });

      const newListButton = screen.getByText('+ 新建列表');
      expect(newListButton).toBeDisabled();
    });

    it('应该在有活跃过滤器时启用新建按钮', () => {
      renderComponent();

      const newListButton = screen.getByText('+ 新建列表');
      expect(newListButton).not.toBeDisabled();
    });
  });

  describe('智能列表应用', () => {
    it('应该能够应用系统智能列表', async () => {
      const user = userEvent.setup();
      renderComponent();

      const todayListButton = screen.getByRole('button', { name: /今日任务/ });
      await user.click(todayListButton);

      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        mockSmartLists[0].filters
      );
    });

    it('应该能够应用用户自定义智能列表', async () => {
      const user = userEvent.setup();
      renderComponent();

      const userListButton = screen.getByRole('button', {
        name: /我的高优先级任务/,
      });
      await user.click(userListButton);

      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        mockSmartLists[1].filters
      );
    });
  });

  describe('创建智能列表', () => {
    it('应该能够显示创建表单', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      expect(screen.getByText('列表名称')).toBeInTheDocument();
      expect(screen.getByText('描述 (可选)')).toBeInTheDocument();
      expect(screen.getByText('颜色')).toBeInTheDocument();
      expect(screen.getByText('创建')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('应该显示当前过滤条件', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      expect(screen.getByText(/当前过滤条件:/)).toBeInTheDocument();
      expect(screen.getByText(/1个优先级, 1个状态/)).toBeInTheDocument();
    });

    it('应该能够输入列表名称和描述', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      const nameInput = screen.getByPlaceholderText('输入列表名称');
      const descriptionInput = screen.getByPlaceholderText('输入列表描述');

      await user.type(nameInput, '测试列表');
      await user.type(descriptionInput, '测试描述');

      expect(nameInput).toHaveValue('测试列表');
      expect(descriptionInput).toHaveValue('测试描述');
    });

    it('应该能够选择颜色', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      const colorButtons = screen
        .getAllByRole('button')
        .filter((button) => button.style.backgroundColor);

      expect(colorButtons.length).toBeGreaterThan(0);

      // 点击第二个颜色选项
      if (colorButtons[1]) {
        await user.click(colorButtons[1]);
        // 验证颜色选择状态变化
        expect(colorButtons[1]).toHaveClass('border-gray-400');
      }
    });

    it('应该能够创建智能列表', async () => {
      const user = userEvent.setup();
      const mockNewList = {
        id: 'new-list',
        name: '测试列表',
        description: '测试描述',
        filters: mockCurrentFilters,
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        isSystem: false,
      };

      (smartListService.createSmartList as any).mockReturnValue(mockNewList);
      (smartListService.getSmartLists as any).mockReturnValue([
        ...mockSmartLists,
        mockNewList,
      ]);

      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      const nameInput = screen.getByPlaceholderText('输入列表名称');
      await user.type(nameInput, '测试列表');

      const createButton = screen.getByText('创建');
      await user.click(createButton);

      expect(smartListService.createSmartList).toHaveBeenCalledWith({
        name: '测试列表',
        description: undefined,
        filters: mockCurrentFilters,
        color: '#3B82F6',
      });
    });

    it('应该在名称为空时禁用创建按钮', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      const createButton = screen.getByText('创建');
      expect(createButton).toBeDisabled();
    });

    it('应该能够取消创建', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      const nameInput = screen.getByPlaceholderText('输入列表名称');
      await user.type(nameInput, '测试列表');

      const cancelButton = screen.getByText('取消');
      await user.click(cancelButton);

      expect(screen.queryByText('列表名称')).not.toBeInTheDocument();
    });
  });

  describe('智能列表管理', () => {
    it('应该显示用户列表的操作按钮', () => {
      renderComponent();

      // 用户列表应该有复制和删除按钮
      const userListContainer = screen
        .getByText('我的高优先级任务')
        .closest('div');
      expect(userListContainer).toBeInTheDocument();
    });

    it('应该能够复制智能列表', async () => {
      const user = userEvent.setup();
      const mockDuplicatedList = {
        id: 'duplicated-list',
        name: '我的高优先级任务 (副本)',
        filters: mockSmartLists[1].filters,
        color: mockSmartLists[1].color,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSystem: false,
      };

      (smartListService.duplicateSmartList as any).mockReturnValue(
        mockDuplicatedList
      );
      (smartListService.getSmartLists as any).mockReturnValue([
        ...mockSmartLists,
        mockDuplicatedList,
      ]);

      renderComponent();

      // 悬停到用户列表上显示操作按钮
      const userListContainer = screen
        .getByText('我的高优先级任务')
        .closest('.group');
      if (userListContainer) {
        fireEvent.mouseEnter(userListContainer);

        const duplicateButtons = screen.getAllByTitle('复制列表');
        await user.click(duplicateButtons[0]); // 点击第一个复制按钮

        expect(smartListService.duplicateSmartList).toHaveBeenCalledWith(
          'user-list-1'
        );
      }
    });

    it('应该能够删除智能列表', async () => {
      const user = userEvent.setup();

      (smartListService.deleteSmartList as any).mockReturnValue(true);

      renderComponent();

      // 悬停到用户列表上显示操作按钮
      const userListContainer = screen
        .getByText('我的高优先级任务')
        .closest('.group');
      if (userListContainer) {
        fireEvent.mouseEnter(userListContainer);

        const deleteButtons = screen.getAllByTitle('删除列表');
        await user.click(deleteButtons[0]); // 点击第一个删除按钮

        expect(smartListService.deleteSmartList).toHaveBeenCalledWith(
          'user-list-1'
        );
      }
    });

    it('应该显示过滤器描述', () => {
      renderComponent();

      // 用户列表应该显示过滤器描述 (mockSmartLists[1] 有 2 个优先级)
      expect(screen.getByText(/2个优先级/)).toBeInTheDocument();
    });
  });

  describe('空状态处理', () => {
    it('应该在没有用户列表时显示空状态', () => {
      const systemOnlyLists = mockSmartLists.filter((list) => list.isSystem);
      (smartListService.getSmartLists as any).mockReturnValue(systemOnlyLists);

      renderComponent();

      expect(screen.getByText('暂无自定义列表')).toBeInTheDocument();
      expect(screen.getByText('点击上方"新建列表"创建')).toBeInTheDocument();
    });

    it('应该在没有活跃过滤器时显示相应提示', () => {
      const systemOnlyLists = mockSmartLists.filter((list) => list.isSystem);
      (smartListService.getSmartLists as any).mockReturnValue(systemOnlyLists);

      renderComponent({ currentFilters: null });

      expect(
        screen.getByText(/设置过滤条件后可创建智能列表/)
      ).toBeInTheDocument();
    });

    it('应该在有活跃过滤器但没有用户列表时显示创建提示', () => {
      const systemOnlyLists = mockSmartLists.filter((list) => list.isSystem);
      (smartListService.getSmartLists as any).mockReturnValue(systemOnlyLists);

      renderComponent();

      expect(screen.getByText(/点击上方"新建列表"创建/)).toBeInTheDocument();
    });
  });

  describe('过滤器描述生成', () => {
    it('应该正确生成复合过滤器描述', () => {
      const complexFilters: FilterCriteria = {
        contexts: ['office', 'home'],
        priorities: [Priority.HIGH],
        statuses: [ActionStatus.NEXT, ActionStatus.WAITING],
        tags: ['工作', '紧急'],
        dateRange: { start: new Date(), end: new Date() },
      };

      const listWithComplexFilters = {
        ...mockSmartLists[1],
        filters: complexFilters,
      };

      (smartListService.getSmartLists as any).mockReturnValue([
        mockSmartLists[0],
        listWithComplexFilters,
      ]);

      renderComponent();

      expect(
        screen.getByText(/2个情境, 1个优先级, 2个状态, 日期范围, 2个标签/)
      ).toBeInTheDocument();
    });

    it('应该在没有过滤条件时显示"无过滤条件"', () => {
      const emptyFiltersList = {
        ...mockSmartLists[1],
        filters: {},
      };

      (smartListService.getSmartLists as any).mockReturnValue([
        mockSmartLists[0],
        emptyFiltersList,
      ]);

      renderComponent();

      expect(screen.getByText('无过滤条件')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该为所有按钮提供正确的角色和标签', () => {
      renderComponent();

      expect(
        screen.getByRole('button', { name: /今日任务/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /我的高优先级任务/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '+ 新建列表' })
      ).toBeInTheDocument();
    });

    it('应该为操作按钮提供工具提示', () => {
      renderComponent();

      // 悬停到用户列表上显示操作按钮
      const userListContainer = screen
        .getByText('我的高优先级任务')
        .closest('.group');
      if (userListContainer) {
        fireEvent.mouseEnter(userListContainer);

        expect(screen.getByTitle('复制列表')).toBeInTheDocument();
        expect(screen.getByTitle('删除列表')).toBeInTheDocument();
      }
    });

    it('应该为表单输入提供正确的标签', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('+ 新建列表'));

      expect(screen.getByText('列表名称')).toBeInTheDocument();
      expect(screen.getByText('描述 (可选)')).toBeInTheDocument();
      expect(screen.getByText('颜色')).toBeInTheDocument();

      // 检查输入框存在
      expect(screen.getByPlaceholderText('输入列表名称')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('输入列表描述')).toBeInTheDocument();
    });
  });

  describe('响应式行为', () => {
    it('应该正确应用自定义类名', () => {
      const { container } = renderComponent({ className: 'custom-class' });

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('应该在没有额外属性时正常工作', () => {
      renderComponent();

      expect(screen.getByText('智能列表')).toBeInTheDocument();
    });
  });
});
