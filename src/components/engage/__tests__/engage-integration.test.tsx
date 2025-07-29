/**
 * 执行功能集成测试
 * 测试任务完成标记、进度跟踪和任务编辑更新功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionCard } from '../ActionCard';
import { TodayView } from '../TodayView';
import { useGTDStore } from '../../../store/gtd-store';
import { ActionStatus, Priority } from '../../../types/enums';
import type { Action, Context } from '../../../types/interfaces';

// Mock store
vi.mock('../../../store/gtd-store');

const mockAction: Action = {
  id: 'action-1',
  title: '完成项目报告',
  description: '准备季度项目报告',
  contextId: 'context1',
  priority: Priority.HIGH,
  status: ActionStatus.NEXT,
  estimatedTime: 120,
  progress: 25,
  dueDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: '需要包含所有部门的数据',
};

const mockContext: Context = {
  id: 'context1',
  name: '办公室',
  color: '#3B82F6',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStore = {
  actions: [mockAction],
  contexts: [mockContext],
  getTodayActions: vi.fn(),
  completeAction: vi.fn(),
  updateAction: vi.fn(),
  updateActionProgress: vi.fn(),
  engageError: null,
  clearEngageError: vi.fn(),
  isLoading: false,
};

describe('执行功能集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGTDStore as any).mockReturnValue(mockStore);
  });

  describe('任务完成标记', () => {
    it('应该能够标记任务为完成', async () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 点击完成按钮
      const completeButton = screen.getByText('完成');
      fireEvent.click(completeButton);

      // 验证完成回调被调用
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('应该在TodayView中正确处理任务完成', async () => {
      render(<TodayView />);

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      });

      // 点击完成按钮
      const completeButton = screen.getByText('完成');
      fireEvent.click(completeButton);

      // 验证store方法被调用
      expect(mockStore.completeAction).toHaveBeenCalledWith('action-1');
    });

    it('应该显示完成任务的统计信息', () => {
      const completedAction = {
        ...mockAction,
        status: ActionStatus.COMPLETED,
        completedAt: new Date(),
      };

      const storeWithCompleted = {
        ...mockStore,
        actions: [completedAction],
      };

      (useGTDStore as any).mockReturnValue(storeWithCompleted);

      render(<TodayView />);

      // 检查已完成统计
      expect(screen.getByText('1')).toBeInTheDocument(); // 已完成数量
    });
  });

  describe('任务进度跟踪', () => {
    it('应该显示任务进度', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 检查进度标签
      expect(screen.getByText('25% 完成')).toBeInTheDocument();
    });

    it('应该支持快速进度更新', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 点击增加进度按钮
      const increaseButton = screen.getByTitle('增加25%进度');
      fireEvent.click(increaseButton);

      // 验证更新回调被调用
      expect(onUpdate).toHaveBeenCalledWith({ progress: 50 });
    });

    it('应该支持减少进度', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 点击减少进度按钮
      const decreaseButton = screen.getByTitle('减少25%进度');
      fireEvent.click(decreaseButton);

      // 验证更新回调被调用
      expect(onUpdate).toHaveBeenCalledWith({ progress: 0 });
    });

    it('应该在展开模式下显示进度条', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 展开详情
      const expandButton = screen.getByTitle('展开详情');
      fireEvent.click(expandButton);

      // 检查进度条
      expect(screen.getByText('任务进度')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('应该在编辑模式下支持进度滑块', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 检查进度滑块
      const progressSlider = screen.getByRole('slider');
      expect(progressSlider).toBeInTheDocument();
      expect(progressSlider).toHaveValue('25');
    });

    it('应该限制进度在0-100范围内', () => {
      const actionWith100Progress = { ...mockAction, progress: 100 };
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={actionWith100Progress}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 100%进度时不应显示快速更新按钮
      expect(screen.queryByTitle('增加25%进度')).not.toBeInTheDocument();
    });
  });

  describe('任务编辑和更新', () => {
    it('应该支持编辑任务标题', async () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 修改标题
      const titleInput = screen.getByDisplayValue('完成项目报告');
      fireEvent.change(titleInput, { target: { value: '完成季度项目报告' } });

      // 保存更改
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证更新回调被调用
      expect(onUpdate).toHaveBeenCalledWith({
        title: '完成季度项目报告',
        description: '准备季度项目报告',
        notes: '需要包含所有部门的数据',
        progress: 25,
      });
    });

    it('应该支持编辑任务描述', async () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 修改描述
      const descriptionTextarea = screen.getByDisplayValue('准备季度项目报告');
      fireEvent.change(descriptionTextarea, {
        target: { value: '准备详细的季度项目报告' },
      });

      // 保存更改
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证更新回调被调用
      expect(onUpdate).toHaveBeenCalledWith({
        title: '完成项目报告',
        description: '准备详细的季度项目报告',
        notes: '需要包含所有部门的数据',
        progress: 25,
      });
    });

    it('应该支持取消编辑', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 修改标题
      const titleInput = screen.getByDisplayValue('完成项目报告');
      fireEvent.change(titleInput, { target: { value: '修改后的标题' } });

      // 取消编辑
      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      // 验证标题恢复原值
      expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('应该支持键盘快捷键保存和取消', () => {
      const onComplete = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ActionCard
          action={mockAction}
          contextName={mockContext.name}
          contextColor={mockContext.color}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      );

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 修改标题
      const titleInput = screen.getByDisplayValue('完成项目报告');
      fireEvent.change(titleInput, { target: { value: '修改后的标题' } });

      // 使用Ctrl+Enter保存
      fireEvent.keyDown(titleInput, { key: 'Enter', ctrlKey: true });

      // 验证更新回调被调用
      expect(onUpdate).toHaveBeenCalledWith({
        title: '修改后的标题',
        description: '准备季度项目报告',
        notes: '需要包含所有部门的数据',
        progress: 25,
      });
    });

    it('应该在TodayView中正确处理任务更新', async () => {
      render(<TodayView />);

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      });

      // 进入编辑模式
      const editButton = screen.getByTitle('编辑任务');
      fireEvent.click(editButton);

      // 修改标题并保存
      const titleInput = screen.getByDisplayValue('完成项目报告');
      fireEvent.change(titleInput, { target: { value: '更新的任务标题' } });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证store方法被调用
      expect(mockStore.updateAction).toHaveBeenCalledWith('action-1', {
        title: '更新的任务标题',
        description: '准备季度项目报告',
        notes: '需要包含所有部门的数据',
        progress: 25,
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理完成任务时的错误', async () => {
      const errorStore = {
        ...mockStore,
        completeAction: vi.fn().mockRejectedValue(new Error('完成任务失败')),
      };

      (useGTDStore as any).mockReturnValue(errorStore);

      // 模拟console.error以避免测试输出错误
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TodayView />);

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      });

      // 点击完成按钮
      const completeButton = screen.getByText('完成');
      fireEvent.click(completeButton);

      // 等待错误处理
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '完成任务失败:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('应该处理更新任务时的错误', async () => {
      const errorStore = {
        ...mockStore,
        updateAction: vi.fn().mockRejectedValue(new Error('更新任务失败')),
      };

      (useGTDStore as any).mockReturnValue(errorStore);

      // 模拟console.error以避免测试输出错误
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TodayView />);

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('完成项目报告')).toBeInTheDocument();
      });

      // 点击快速进度更新按钮
      const increaseButton = screen.getByTitle('增加25%进度');
      fireEvent.click(increaseButton);

      // 等待错误处理
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '更新任务失败:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
