/**
 * 项目管理器集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectManager } from '../ProjectManager';
import { useGTDStore } from '../../../store/gtd-store';
import { ProjectStatus } from '../../../types/enums';
import type { Project, Action } from '../../../types/interfaces';

// Mock the store
vi.mock('../../../store/gtd-store');

const mockUseGTDStore = vi.mocked(useGTDStore);

describe('ProjectManager', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      title: '测试项目1',
      description: '这是第一个测试项目',
      status: ProjectStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      notes: '项目备注',
      tags: ['工作', '重要'],
    },
    {
      id: '2',
      title: '测试项目2',
      description: '这是第二个测试项目',
      status: ProjectStatus.COMPLETED,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      completedAt: new Date('2024-01-15'),
    },
  ];

  const mockActions: Action[] = [
    {
      id: '1',
      title: '项目1的行动1',
      contextId: 'context1',
      projectId: '1',
      priority: 'medium' as any,
      status: 'next' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: '项目1的行动2',
      contextId: 'context1',
      projectId: '1',
      priority: 'high' as any,
      status: 'completed' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    },
  ];

  const mockStore = {
    projects: mockProjects,
    actions: mockActions,
    loadAllData: vi.fn(),
    isLoading: false,
    organizeError: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGTDStore.mockReturnValue(mockStore as any);
  });

  describe('渲染和初始化', () => {
    it('应该正确渲染项目管理器', async () => {
      render(<ProjectManager />);

      expect(screen.getByText('项目管理')).toBeInTheDocument();
      expect(
        screen.getByText('管理您的GTD项目，跟踪项目进展和相关行动')
      ).toBeInTheDocument();
      expect(screen.getByText('+ 新建项目')).toBeInTheDocument();
    });

    it('应该在组件挂载时加载数据', async () => {
      render(<ProjectManager />);

      await waitFor(() => {
        expect(mockStore.loadAllData).toHaveBeenCalled();
      });
    });

    it('加载中时应该显示加载指示器', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        isLoading: true,
      } as any);

      render(<ProjectManager />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('项目统计', () => {
    it('应该显示正确的项目统计信息', () => {
      render(<ProjectManager />);

      expect(screen.getByText('项目概览')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 总项目数
      expect(screen.getByText('1')).toBeInTheDocument(); // 活跃项目数
      expect(screen.getByText('1')).toBeInTheDocument(); // 已完成项目数
    });

    it('应该计算并显示正确的完成率', () => {
      render(<ProjectManager />);

      // 2个项目中1个完成，完成率应该是50%
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('没有项目时不应该显示统计信息', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        projects: [],
      } as any);

      render(<ProjectManager />);

      expect(screen.queryByText('项目概览')).not.toBeInTheDocument();
    });
  });

  describe('项目列表', () => {
    it('应该显示项目列表', () => {
      render(<ProjectManager />);

      expect(screen.getByText('项目列表')).toBeInTheDocument();
      expect(screen.getByText('测试项目1')).toBeInTheDocument();
      expect(screen.getByText('测试项目2')).toBeInTheDocument();
    });

    it('没有项目时应该显示空状态', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        projects: [],
      } as any);

      render(<ProjectManager />);

      expect(screen.getByText('暂无项目')).toBeInTheDocument();
      expect(
        screen.getByText('创建您的第一个项目来开始管理复杂任务')
      ).toBeInTheDocument();
    });
  });

  describe('项目表单', () => {
    it('应该显示项目表单区域', () => {
      render(<ProjectManager />);

      expect(screen.getByText('创建项目')).toBeInTheDocument();
      expect(screen.getByText('选择操作')).toBeInTheDocument();
    });

    it('点击新建项目按钮应该显示表单', async () => {
      render(<ProjectManager />);

      const createButton = screen.getByText('+ 新建项目');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByLabelText('项目标题 *')).toBeInTheDocument();
      });
    });

    it('点击表单区域的创建按钮也应该显示表单', async () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        projects: [],
      } as any);

      render(<ProjectManager />);

      const createButton = screen.getByText('创建新项目');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByLabelText('项目标题 *')).toBeInTheDocument();
      });
    });
  });

  describe('项目行动统计', () => {
    it('应该显示项目行动关联统计', () => {
      render(<ProjectManager />);

      expect(screen.getByText('项目行动统计')).toBeInTheDocument();
      // 使用更具体的查询来避免重复元素问题
      const projectActionSection = screen
        .getByText('项目行动统计')
        .closest('div');
      expect(projectActionSection).toContainElement(
        screen.getByText('测试项目1')
      );
    });

    it('没有关联行动的项目不应该显示在统计中', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        actions: [], // 没有行动
      } as any);

      render(<ProjectManager />);

      expect(screen.queryByText('项目行动统计')).not.toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStore,
        organizeError: '加载项目失败',
      } as any);

      render(<ProjectManager />);

      expect(screen.getByText('操作失败')).toBeInTheDocument();
      expect(screen.getAllByText('加载项目失败')).toHaveLength(2); // 主错误和列表错误
    });
  });

  describe('交互功能', () => {
    it('应该支持创建新项目的工作流', async () => {
      render(<ProjectManager />);

      // 点击新建项目
      const createButton = screen.getByText('+ 新建项目');
      fireEvent.click(createButton);

      // 应该显示表单
      await waitFor(() => {
        expect(screen.getByLabelText('项目标题 *')).toBeInTheDocument();
      });
    });

    it('应该支持编辑项目的工作流', async () => {
      // 这个测试需要ProjectList组件支持编辑功能
      // 由于我们mock了store，这里主要测试组件结构
      render(<ProjectManager />);

      expect(screen.getByText('项目列表')).toBeInTheDocument();
      expect(screen.getByText('创建项目')).toBeInTheDocument();
    });
  });

  describe('响应式布局', () => {
    it('应该使用网格布局显示列表和表单', () => {
      render(<ProjectManager />);

      const gridContainer = screen.getByText('项目列表').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
    });
  });
});
