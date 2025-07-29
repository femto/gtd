/**
 * InboxList组件集成测试
 * 测试工作篮列表的显示、过滤和批量操作功能
 */

// React is imported automatically by Vite
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InboxList } from '../InboxList';
import { useGTDStore } from '../../../store/gtd-store';
import { InputType } from '../../../types';

// Mock store
const mockStore = {
  inboxItems: [],
  getInboxItems: vi.fn(),
  markAsProcessed: vi.fn(),
  deleteInboxItem: vi.fn(),
  captureError: null,
  clearCaptureError: vi.fn(),
};

vi.mock('../../../store/gtd-store', () => ({
  useGTDStore: vi.fn(),
}));

const mockInboxItems = [
  {
    id: '1',
    content: '准备会议材料',
    type: InputType.TEXT,
    processed: false,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    content: '录制语音备忘',
    type: InputType.VOICE,
    processed: true,
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: '3',
    content: '保存重要图片',
    type: InputType.IMAGE,
    processed: false,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
  },
];

describe('InboxList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGTDStore).mockReturnValue({
      ...mockStore,
      inboxItems: mockInboxItems,
    } as any);
  });

  describe('基本渲染', () => {
    it('应该正确渲染工作篮列表', async () => {
      render(<InboxList />);

      // 检查标题
      expect(screen.getByText('工作篮')).toBeInTheDocument();

      // 检查统计信息
      expect(screen.getByText('总计: 3')).toBeInTheDocument();
      expect(screen.getByText('未处理: 2')).toBeInTheDocument();
      expect(screen.getByText('已处理: 1')).toBeInTheDocument();

      // 检查项目内容
      expect(screen.getByText('准备会议材料')).toBeInTheDocument();
      expect(screen.getByText('录制语音备忘')).toBeInTheDocument();
      expect(screen.getByText('保存重要图片')).toBeInTheDocument();
    });

    it('应该显示正确的类型图标', () => {
      render(<InboxList />);

      // 检查类型图标（通过emoji）
      const textIcon = screen.getByText('📝');
      const voiceIcon = screen.getByText('🎤');
      const imageIcon = screen.getByText('🖼️');

      expect(textIcon).toBeInTheDocument();
      expect(voiceIcon).toBeInTheDocument();
      expect(imageIcon).toBeInTheDocument();
    });

    it('应该正确显示处理状态', () => {
      render(<InboxList />);

      // 检查已处理标记
      const processedBadges = screen.getAllByText('已处理');
      expect(processedBadges).toHaveLength(1);

      // 检查处理按钮
      const processButtons = screen.getAllByText('处理');
      expect(processButtons).toHaveLength(2); // 两个未处理的项目

      const viewButtons = screen.getAllByText('查看');
      expect(viewButtons).toHaveLength(1); // 一个已处理的项目
    });
  });

  describe('过滤功能', () => {
    it('应该能够按处理状态过滤', async () => {
      render(<InboxList />);

      // 过滤未处理项目
      const statusFilter = screen.getByDisplayValue('全部');
      fireEvent.change(statusFilter, { target: { value: 'unprocessed' } });

      // 应该只显示未处理的项目
      expect(screen.getByText('准备会议材料')).toBeInTheDocument();
      expect(screen.getByText('保存重要图片')).toBeInTheDocument();
      expect(screen.queryByText('录制语音备忘')).not.toBeInTheDocument();
    });

    it('应该能够按类型过滤', async () => {
      render(<InboxList />);

      // 过滤文本类型
      const typeFilters = screen.getAllByDisplayValue('全部');
      const typeFilter = typeFilters[1]; // 第二个是类型过滤器
      fireEvent.change(typeFilter, { target: { value: InputType.TEXT } });

      // 应该只显示文本类型的项目
      expect(screen.getByText('准备会议材料')).toBeInTheDocument();
      expect(screen.queryByText('录制语音备忘')).not.toBeInTheDocument();
      expect(screen.queryByText('保存重要图片')).not.toBeInTheDocument();
    });
  });

  describe('选择功能', () => {
    it('应该能够选择单个项目', () => {
      render(<InboxList />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1]; // 第一个是全选框

      fireEvent.click(firstItemCheckbox);

      expect(firstItemCheckbox).toBeChecked();
      expect(screen.getByText('已选择 1 项')).toBeInTheDocument();
    });

    it('应该能够全选和取消全选', () => {
      render(<InboxList />);

      const selectAllCheckbox = screen.getByLabelText('全选');

      // 全选
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByText('已选择 3 项')).toBeInTheDocument();

      // 取消全选
      fireEvent.click(selectAllCheckbox);
      expect(screen.queryByText(/已选择/)).not.toBeInTheDocument();
    });
  });

  describe('批量操作', () => {
    it('应该能够批量标记为已处理', async () => {
      render(<InboxList />);

      // 选择项目
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // 选择第一个项目

      // 点击批量处理按钮
      const batchProcessButton = screen.getByText('标记已处理');
      fireEvent.click(batchProcessButton);

      await waitFor(() => {
        expect(mockStore.markAsProcessed).toHaveBeenCalledWith('1');
      });
    });

    it('应该能够批量删除', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<InboxList />);

      // 选择项目
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // 选择第一个项目

      // 点击批量删除按钮
      const batchDeleteButton = screen.getByText('删除');
      fireEvent.click(batchDeleteButton);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith(
          '确定要删除选中的 1 个项目吗？'
        );
        expect(mockStore.deleteInboxItem).toHaveBeenCalledWith('1');
      });

      confirmSpy.mockRestore();
    });

    it('应该在用户取消删除确认时不执行删除', async () => {
      // Mock window.confirm 返回 false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<InboxList />);

      // 选择项目
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      // 点击批量删除按钮
      const batchDeleteButton = screen.getByText('删除');
      fireEvent.click(batchDeleteButton);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(mockStore.deleteInboxItem).not.toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('单个项目操作', () => {
    it('应该能够处理单个项目', async () => {
      render(<InboxList />);

      const processButtons = screen.getAllByText('处理');
      fireEvent.click(processButtons[0]);

      await waitFor(() => {
        expect(mockStore.markAsProcessed).toHaveBeenCalledWith('1');
      });
    });

    it('应该能够删除单个项目', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<InboxList />);

      const deleteButtons = screen.getAllByText('删除');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('确定要删除这个项目吗？');
        expect(mockStore.deleteInboxItem).toHaveBeenCalledWith('1');
      });

      confirmSpy.mockRestore();
    });
  });

  describe('回调函数', () => {
    it('应该在项目被选择时调用回调', () => {
      const onItemSelect = vi.fn();
      render(<InboxList onItemSelect={onItemSelect} />);

      const firstItem = screen.getByText('准备会议材料');
      fireEvent.click(firstItem);

      expect(onItemSelect).toHaveBeenCalledWith(mockInboxItems[0]);
    });

    it('应该在已处理项目被查看时调用回调', () => {
      const onItemProcess = vi.fn();
      render(<InboxList onItemProcess={onItemProcess} />);

      const viewButton = screen.getByText('查看');
      fireEvent.click(viewButton);

      expect(onItemProcess).toHaveBeenCalledWith(mockInboxItems[1]);
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', () => {
      vi.mocked(useGTDStore).mockReturnValue({
        ...mockStore,
        inboxItems: mockInboxItems,
        captureError: '网络连接失败',
      } as any);

      render(<InboxList />);

      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    });

    it('应该能够清除错误信息', () => {
      vi.mocked(useGTDStore).mockReturnValue({
        ...mockStore,
        inboxItems: mockInboxItems,
        captureError: '网络连接失败',
      } as any);

      render(<InboxList />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockStore.clearCaptureError).toHaveBeenCalled();
    });
  });

  describe('空状态', () => {
    it('应该显示空工作篮提示', () => {
      vi.mocked(useGTDStore).mockReturnValue({
        ...mockStore,
        inboxItems: [],
      } as any);

      render(<InboxList />);

      expect(screen.getByText('工作篮是空的')).toBeInTheDocument();
      expect(
        screen.getByText('开始收集你的想法和任务吧！')
      ).toBeInTheDocument();
    });

    it('应该在过滤后无结果时显示提示', () => {
      render(<InboxList />);

      // 过滤一个不存在的类型
      const typeFilters = screen.getAllByDisplayValue('全部');
      const typeFilter = typeFilters[1];
      fireEvent.change(typeFilter, { target: { value: 'nonexistent' } });

      expect(screen.getByText('没有符合条件的项目')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该在初始加载时显示加载指示器', () => {
      vi.mocked(useGTDStore).mockReturnValue({
        ...mockStore,
        inboxItems: [],
      } as any);

      render(<InboxList />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('数据加载', () => {
    it('应该在组件挂载时加载数据', () => {
      render(<InboxList />);

      expect(mockStore.getInboxItems).toHaveBeenCalled();
    });
  });
});
