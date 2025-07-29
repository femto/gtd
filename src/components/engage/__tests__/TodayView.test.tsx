/**
 * TodayView组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodayView } from '../TodayView';
import { useGTDStore } from '../../../store/gtd-store';
import { ActionStatus, Priority } from '../../../types/enums';
import type { Action, Context } from '../../../types/interfaces';

// Mock store
vi.mock('../../../store/gtd-store');

const mockActions: Action[] = [
  {
    id: '1',
    title: '完成项目报告',
    description: '准备季度项目报告',
    contextId: 'context1',
    priority: Priority.HIGH,
    status: ActionStatus.NEXT,
    estimatedTime: 120,
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: '回复邮件',
    contextId: 'context2',
    priority: Priority.MEDIUM,
    status: ActionStatus.NEXT,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: '过期任务',
    contextId: 'context1',
    priority: Priority.URGENT,
    status: ActionStatus.NEXT,
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockContexts: Context[] = [
  {
    id: 'context1',
    name: '办公室',
    color: '#3B82F6',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'context2',
    name: '电脑',
    color: '#10B981',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockStore = {
  actions: mockActions,
  contexts: mockContexts,
  getTodayActions: vi.fn(),
  completeAction: vi.fn(),
  updateAction: vi.fn(),
  engageError: null,
  clearEngageError: vi.fn(),
  isLoading: false,
};

describe('TodayView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGTDStore as any).mockReturnValue(mockStore);
  });

  it('应该正确渲染今日任务视图', async () => {
    render(<TodayView />);

    // 检查页面标题
    expect(screen.getByText('今日任务')).toBeInTheDocument();

    // 检查统计信息
    expect(screen.getByText('0')).toBeInTheDocument(); // 已完成
    expect(screen.getByText('3')).toBeInTheDocument(); // 待处理

    // 检查任务列表
    expect(screen.getByText('完成项目报告')).toBeInTheDocument();
    expect(screen.getByText('回复邮件')).toBeInTheDocument();
    expect(screen.getByText('过期任务')).toBeInTheDocument();
  });

  it('应该正确显示过期任务', () => {
    render(<TodayView />);

    // 检查过期任务部分
    expect(screen.getByText('过期任务 (1)')).toBeInTheDocument();
    expect(screen.getByText('今日任务 (2)')).toBeInTheDocument();
  });

  it('应该支持搜索功能', async () => {
    render(<TodayView />);

    const searchInput = screen.getByPlaceholderText('搜索今日任务...');

    // 输入搜索关键词
    fireEvent.change(searchInput, { target: { value: '报告' } });

    await waitFor(() => {
      // 应该只显示包含"报告"的任务
      expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      expect(screen.queryByText('回复邮件')).not.toBeInTheDocument();
    });
  });

  it('应该支持过滤功能', async () => {
    render(<TodayView />);

    // 打开过滤器
    const filterButton = screen.getByText('过滤器');
    fireEvent.click(filterButton);

    // 检查过滤器是否显示
    expect(screen.getByText('按情境过滤')).toBeInTheDocument();
    expect(screen.getByText('按优先级过滤')).toBeInTheDocument();
  });

  it('应该能够完成任务', async () => {
    render(<TodayView />);

    // 找到完成按钮并点击 (过期任务排在前面，所以第一个是过期任务)
    const completeButtons = screen.getAllByText('完成');
    fireEvent.click(completeButtons[0]);

    // 检查是否调用了完成任务的方法 (过期任务的ID是'3')
    expect(mockStore.completeAction).toHaveBeenCalledWith('3');
  });

  it('应该显示加载状态', () => {
    const loadingStore = { ...mockStore, isLoading: true };
    (useGTDStore as any).mockReturnValue(loadingStore);

    render(<TodayView />);

    expect(screen.getByText('加载今日任务...')).toBeInTheDocument();
  });

  it('应该显示错误信息', () => {
    const errorStore = { ...mockStore, engageError: '加载失败' };
    (useGTDStore as any).mockReturnValue(errorStore);

    render(<TodayView />);

    expect(screen.getByText('加载失败')).toBeInTheDocument();
  });

  it('应该显示空状态', () => {
    const emptyStore = { ...mockStore, actions: [] };
    (useGTDStore as any).mockReturnValue(emptyStore);

    render(<TodayView />);

    expect(screen.getByText('今天没有待处理的任务')).toBeInTheDocument();
    expect(screen.getByText('恭喜！你今天的任务都完成了')).toBeInTheDocument();
  });

  it('应该支持清除过滤器', async () => {
    render(<TodayView />);

    const searchInput = screen.getByPlaceholderText('搜索今日任务...');
    fireEvent.change(searchInput, { target: { value: '测试' } });

    // 点击清除过滤器
    const clearButton = screen.getByText('清除所有过滤器');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('应该正确显示任务优先级', () => {
    render(<TodayView />);

    // 检查优先级标签
    expect(screen.getByText('高')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
    expect(screen.getByText('紧急')).toBeInTheDocument();
  });

  it('应该正确显示情境信息', () => {
    render(<TodayView />);

    // 检查情境标签 (使用getAllByText因为可能有多个相同的情境)
    expect(screen.getAllByText('办公室').length).toBeGreaterThan(0);
    expect(screen.getByText('电脑')).toBeInTheDocument();
  });

  it('应该在组件挂载时加载今日任务', () => {
    render(<TodayView />);

    expect(mockStore.getTodayActions).toHaveBeenCalled();
  });
});
