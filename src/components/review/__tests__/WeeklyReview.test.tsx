/**
 * WeeklyReview组件测试
 */

// React is used via JSX transform
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WeeklyReview } from '../WeeklyReview';
import { useGTDStore } from '../../../store/gtd-store';
import { ProjectStatus, ActionStatus } from '../../../types/enums';
import type {
  ReviewData,
  Project,
  Action,
  InboxItem,
  WaitingItem,
} from '../../../types/interfaces';

// Mock the store
vi.mock('../../../store/gtd-store');

const mockUseGTDStore = vi.mocked(useGTDStore);

describe('WeeklyReview', () => {
  const mockReviewData: ReviewData = {
    date: new Date('2024-01-15'),
    completedActions: 12,
    completedProjects: 2,
    pendingActions: 8,
    pendingProjects: 3,
    waitingItems: 4,
  };

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      title: '网站重构项目',
      description: '重构公司官网',
      status: ProjectStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      id: 'project-2',
      title: '市场调研',
      description: '调研竞争对手',
      status: ProjectStatus.ON_HOLD,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-08'),
    },
    {
      id: 'project-3',
      title: '产品发布',
      description: '新产品发布准备',
      status: ProjectStatus.COMPLETED,
      completedAt: new Date('2024-01-12'),
      createdAt: new Date('2023-12-01'),
      updatedAt: new Date('2024-01-12'),
    },
  ];

  const mockActions: Action[] = [
    {
      id: 'action-1',
      title: '设计数据库架构',
      contextId: 'context-1',
      projectId: 'project-1',
      priority: 'high' as any,
      status: ActionStatus.NEXT,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      id: 'action-2',
      title: '编写API文档',
      contextId: 'context-1',
      projectId: 'project-1',
      priority: 'medium' as any,
      status: ActionStatus.COMPLETED,
      completedAt: new Date('2024-01-12'),
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-12'),
    },
    {
      id: 'action-3',
      title: '联系供应商',
      contextId: 'context-2',
      priority: 'medium' as any,
      status: ActionStatus.NEXT,
      dueDate: new Date('2024-01-10'), // 过期任务
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    },
  ];

  const mockInboxItems: InboxItem[] = [
    {
      id: 'inbox-1',
      content: '准备会议材料',
      type: 'text' as any,
      processed: false,
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: 'inbox-2',
      content: '购买办公用品',
      type: 'text' as any,
      processed: true,
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13'),
    },
  ];

  const mockWaitingItems: WaitingItem[] = [
    {
      id: 'waiting-1',
      title: '等待客户反馈',
      waitingFor: '客户A',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    },
  ];

  const mockStoreState = {
    reviewData: mockReviewData,
    isReviewing: false,
    reviewError: null,
    lastReviewDate: new Date('2024-01-08'),
    projects: mockProjects,
    actions: mockActions,
    waitingItems: mockWaitingItems,
    inboxItems: mockInboxItems,
    generateWeeklyReview: vi.fn().mockResolvedValue(mockReviewData),
    updateProjectStatus: vi.fn().mockResolvedValue(undefined),
    clearReviewError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGTDStore.mockReturnValue(mockStoreState as any);
  });

  describe('渲染和初始化', () => {
    it('应该正确渲染组件标题和导航标签', () => {
      render(<WeeklyReview />);

      expect(screen.getByText('每周回顾')).toBeInTheDocument();
      expect(screen.getByText('回顾检查清单')).toBeInTheDocument();
      expect(screen.getByText('项目回顾')).toBeInTheDocument();
      expect(screen.getByText('数据统计')).toBeInTheDocument();
    });

    it('应该在组件挂载时生成回顾数据', () => {
      render(<WeeklyReview />);

      expect(mockStoreState.generateWeeklyReview).toHaveBeenCalledTimes(1);
    });

    it('应该在组件卸载时清除错误', () => {
      const { unmount } = render(<WeeklyReview />);

      unmount();

      expect(mockStoreState.clearReviewError).toHaveBeenCalledTimes(1);
    });

    it('应该显示关闭按钮当提供onClose回调时', () => {
      const mockOnClose = vi.fn();
      render(<WeeklyReview onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('回顾检查清单', () => {
    it('应该显示默认的检查清单项目', () => {
      render(<WeeklyReview />);

      expect(screen.getByText('收集散落的纸张和材料')).toBeInTheDocument();
      expect(screen.getByText('处理笔记和想法')).toBeInTheDocument();
      expect(screen.getByText('清空工作篮')).toBeInTheDocument();
      expect(screen.getByText('回顾日程安排')).toBeInTheDocument();
      expect(screen.getByText('回顾等待清单')).toBeInTheDocument();
      expect(screen.getByText('回顾项目清单')).toBeInTheDocument();
      expect(screen.getByText('回顾将来/也许清单')).toBeInTheDocument();
    });

    it('应该显示回顾进度条', () => {
      render(<WeeklyReview />);

      expect(screen.getByText('回顾进度')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('应该能够切换检查清单项目的完成状态', () => {
      render(<WeeklyReview />);

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      expect(firstCheckbox).not.toBeChecked();

      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();

      // 进度应该更新
      expect(screen.getByText('14%')).toBeInTheDocument(); // 1/7 ≈ 14%
    });

    it('应该显示回顾笔记文本框', () => {
      render(<WeeklyReview />);

      const notesTextarea = screen.getByPlaceholderText(/记录本次回顾的想法/);
      expect(notesTextarea).toBeInTheDocument();

      fireEvent.change(notesTextarea, { target: { value: '本周回顾笔记' } });
      expect(notesTextarea).toHaveValue('本周回顾笔记');
    });
  });

  describe('项目回顾', () => {
    it('应该显示活跃项目列表', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('项目回顾'));

      expect(screen.getByText('活跃项目回顾')).toBeInTheDocument();
      expect(screen.getByText('网站重构项目')).toBeInTheDocument();
      expect(screen.getByText('重构公司官网')).toBeInTheDocument();
    });

    it('应该显示项目的行动统计信息', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('项目回顾'));

      // 项目1有1个下一步行动，1个已完成行动，总共2个行动
      expect(screen.getByText('下一步行动')).toBeInTheDocument();
      expect(screen.getByText('已完成行动')).toBeInTheDocument();
      expect(screen.getByText('总行动数')).toBeInTheDocument();

      // 检查统计数字
      const nextActionCount =
        screen.getByText('下一步行动').previousElementSibling;
      const completedActionCount =
        screen.getByText('已完成行动').previousElementSibling;
      const totalActionCount =
        screen.getByText('总行动数').previousElementSibling;

      expect(nextActionCount).toHaveTextContent('1');
      expect(completedActionCount).toHaveTextContent('1');
      expect(totalActionCount).toHaveTextContent('2');
    });

    it('应该显示暂停项目列表', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('项目回顾'));

      expect(screen.getByText('暂停项目回顾')).toBeInTheDocument();
      expect(screen.getByText('市场调研')).toBeInTheDocument();
    });

    it('应该能够更新项目状态', async () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('项目回顾'));

      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, {
        target: { value: ProjectStatus.COMPLETED },
      });

      const saveButton = screen.getByText('保存项目状态更新');
      expect(saveButton).toBeInTheDocument();

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockStoreState.updateProjectStatus).toHaveBeenCalledWith(
          'project-1',
          ProjectStatus.COMPLETED
        );
      });
    });

    it('应该警告没有下一步行动的项目', () => {
      // 创建一个没有下一步行动的项目
      const projectWithoutNextActions: Project = {
        id: 'project-empty',
        title: '空项目',
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseGTDStore.mockReturnValue({
        ...mockStoreState,
        projects: [...mockProjects, projectWithoutNextActions],
        actions: mockActions.filter((a) => a.projectId !== 'project-empty'),
      } as any);

      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('项目回顾'));

      expect(screen.getByText(/此项目没有下一步行动/)).toBeInTheDocument();
    });
  });

  describe('数据统计', () => {
    it('应该显示回顾数据统计', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('12')).toBeInTheDocument(); // 完成行动
      expect(screen.getByText('本周完成行动')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 完成项目
      expect(screen.getByText('本周完成项目')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // 待处理行动
      expect(screen.getByText('待处理行动')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // 活跃项目
      expect(screen.getByText('活跃项目')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 等待项目
      expect(screen.getByText('等待项目')).toBeInTheDocument();
    });

    it('应该显示未处理收集项目数量', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('1')).toBeInTheDocument(); // 未处理收集
      expect(screen.getByText('未处理收集')).toBeInTheDocument();
    });

    it('应该显示过期行动警告', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('⚠️ 过期行动 (1)')).toBeInTheDocument();
      expect(screen.getByText('联系供应商')).toBeInTheDocument();
    });

    it('应该显示工作篮提醒', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('📥 工作篮提醒')).toBeInTheDocument();
      expect(
        screen.getByText(/您的工作篮中还有 1 个未处理的项目/)
      ).toBeInTheDocument();
    });

    it('应该显示系统健康状况', () => {
      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('系统健康状况')).toBeInTheDocument();
      expect(screen.getByText('工作篮清空状态')).toBeInTheDocument();
      expect(screen.getByText('❌ 1 项未处理')).toBeInTheDocument();
      expect(screen.getByText('过期行动')).toBeInTheDocument();
      expect(screen.getByText('❌ 1 项过期')).toBeInTheDocument();
      expect(screen.getByText('上次回顾')).toBeInTheDocument();
    });

    it('应该显示健康的系统状态', () => {
      // 模拟健康的系统状态
      mockUseGTDStore.mockReturnValue({
        ...mockStoreState,
        inboxItems: mockInboxItems.map((item) => ({
          ...item,
          processed: true,
        })),
        actions: mockActions.filter(
          (a) => !a.dueDate || a.dueDate > new Date()
        ),
      } as any);

      render(<WeeklyReview />);

      fireEvent.click(screen.getByText('数据统计'));

      expect(screen.getByText('✅ 已清空')).toBeInTheDocument();
      expect(screen.getByText('✅ 无过期')).toBeInTheDocument();
    });
  });

  describe('加载和错误状态', () => {
    it('应该显示加载状态', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStoreState,
        isReviewing: true,
      } as any);

      render(<WeeklyReview />);

      expect(screen.getByText('正在生成回顾数据...')).toBeInTheDocument();
    });

    it('应该显示错误状态', () => {
      mockUseGTDStore.mockReturnValue({
        ...mockStoreState,
        reviewError: '生成回顾数据失败',
      } as any);

      render(<WeeklyReview />);

      expect(screen.getByText('回顾生成失败')).toBeInTheDocument();
      expect(screen.getByText('生成回顾数据失败')).toBeInTheDocument();

      const retryButton = screen.getByText('重试');
      fireEvent.click(retryButton);

      expect(mockStoreState.generateWeeklyReview).toHaveBeenCalledTimes(2);
    });
  });

  describe('导航和交互', () => {
    it('应该能够在不同标签页之间切换', () => {
      render(<WeeklyReview />);

      // 默认显示检查清单
      expect(screen.getByText('收集散落的纸张和材料')).toBeInTheDocument();

      // 切换到项目回顾
      fireEvent.click(screen.getByText('项目回顾'));
      expect(screen.getByText('活跃项目回顾')).toBeInTheDocument();

      // 切换到数据统计
      fireEvent.click(screen.getByText('数据统计'));
      expect(screen.getByText('本周完成行动')).toBeInTheDocument();

      // 切换回检查清单
      fireEvent.click(screen.getByText('回顾检查清单'));
      expect(screen.getByText('收集散落的纸张和材料')).toBeInTheDocument();
    });

    it('应该正确高亮当前活跃的标签页', () => {
      render(<WeeklyReview />);

      const checklistTab = screen.getByText('回顾检查清单');
      const projectsTab = screen.getByText('项目回顾');

      // 默认检查清单标签页应该是活跃的
      expect(checklistTab).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(projectsTab).toHaveClass('text-gray-500');

      // 点击项目回顾标签页
      fireEvent.click(projectsTab);

      expect(projectsTab).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(checklistTab).toHaveClass('text-gray-500');
    });
  });
});
