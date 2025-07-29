/**
 * 处理向导组件端到端测试
 * 测试完整的GTD处理流程
 */

// import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessingWizard } from '../ProcessingWizard';
import { useGTDStore } from '../../../store/gtd-store';
import { InputType, ActionType, Priority } from '../../../types/enums';
import type { InboxItem, Context } from '../../../types/interfaces';

// Mock store
vi.mock('../../../store/gtd-store');

const mockUseGTDStore = vi.mocked(useGTDStore);

describe('ProcessingWizard', () => {
  const mockItem: InboxItem = {
    id: 'test-item-1',
    content: '准备会议材料',
    type: InputType.TEXT,
    processed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContexts: Context[] = [
    {
      id: 'context-1',
      name: '办公室',
      description: '在办公室完成的任务',
      color: '#3B82F6',
      icon: '🏢',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'context-2',
      name: '电脑',
      description: '需要电脑完成的任务',
      color: '#8B5CF6',
      icon: '💻',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProcessItem = vi.fn();
  const mockClearProcessError = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGTDStore.mockReturnValue({
      processItem: mockProcessItem,
      contexts: mockContexts,
      processError: null,
      clearProcessError: mockClearProcessError,
    } as any);
  });

  it('应该渲染处理向导的初始步骤', () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('处理工作篮项目')).toBeInTheDocument();
    expect(screen.getByText('这是什么？')).toBeInTheDocument();
    expect(screen.getByText(mockItem.content)).toBeInTheDocument();
    expect(screen.getByText('步骤 1 / 5')).toBeInTheDocument();
  });

  it('应该显示正确的进度指示器', () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toHaveStyle('width: 20%'); // 1/5 = 20%
  });

  it('应该允许用户取消处理', () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('应该完成完整的可行动项目处理流程', async () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 步骤1: 这是什么？
    expect(screen.getByText('这是什么？')).toBeInTheDocument();
    const continueButton1 = screen.getByText('继续');
    fireEvent.click(continueButton1);

    // 步骤2: 需要行动吗？
    await waitFor(() => {
      expect(screen.getByText('需要行动吗？')).toBeInTheDocument();
    });

    const actionableButton = screen.getByText('是，需要行动');
    fireEvent.click(actionableButton);

    // 步骤3: 2分钟规则
    await waitFor(() => {
      expect(screen.getByText('预估完成时间')).toBeInTheDocument();
    });

    const timeInput = screen.getByRole('spinbutton');
    fireEvent.change(timeInput, { target: { value: '30' } });

    const continueButton3 = screen.getByText('继续');
    fireEvent.click(continueButton3);

    // 步骤4: 分类决策
    await waitFor(() => {
      expect(screen.getByText('如何处理这个行动？')).toBeInTheDocument();
    });

    const deferButton = screen.getByText('延迟处理');
    fireEvent.click(deferButton);

    // 选择情境
    const contextSelect = screen.getByLabelText('选择情境');
    fireEvent.change(contextSelect, { target: { value: 'context-1' } });

    // 选择优先级
    const prioritySelect = screen.getByLabelText('优先级');
    fireEvent.change(prioritySelect, { target: { value: Priority.HIGH } });

    const continueButton4 = screen.getByText('继续');
    fireEvent.click(continueButton4);

    // 步骤5: 确认
    await waitFor(() => {
      expect(screen.getByText('确认处理决策')).toBeInTheDocument();
    });

    expect(screen.getByText('延迟处理')).toBeInTheDocument();
    expect(screen.getByText('办公室')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();

    const confirmButton = screen.getByText('确认处理');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockProcessItem).toHaveBeenCalledWith(mockItem.id, {
        isActionable: true,
        actionType: ActionType.DEFER,
        timeEstimate: 30,
        context: 'context-1',
        priority: Priority.HIGH,
        notes: '',
      });
    });

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('应该完成非行动项目的处理流程', async () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 步骤1: 这是什么？
    const continueButton1 = screen.getByText('继续');
    fireEvent.click(continueButton1);

    // 步骤2: 需要行动吗？
    await waitFor(() => {
      expect(screen.getByText('需要行动吗？')).toBeInTheDocument();
    });

    const nonActionableButton = screen.getByText('不，不需要行动');
    fireEvent.click(nonActionableButton);

    // 步骤3: 分类决策（跳过2分钟规则）
    await waitFor(() => {
      expect(screen.getByText('如何分类这个项目？')).toBeInTheDocument();
    });

    const referenceButton = screen.getByText('参考资料');
    fireEvent.click(referenceButton);

    const continueButton3 = screen.getByText('继续');
    fireEvent.click(continueButton3);

    // 步骤4: 确认
    await waitFor(() => {
      expect(screen.getByText('确认处理决策')).toBeInTheDocument();
    });

    expect(screen.getByText('参考资料')).toBeInTheDocument();

    const confirmButton = screen.getByText('确认处理');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockProcessItem).toHaveBeenCalledWith(mockItem.id, {
        isActionable: false,
        actionType: ActionType.REFERENCE,
        priority: Priority.MEDIUM,
        notes: '',
      });
    });
  });

  it('应该处理2分钟规则的立即执行情况', async () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 完成前两个步骤
    fireEvent.click(screen.getByText('继续'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('是，需要行动'));
    });

    // 2分钟规则 - 设置为1分钟
    await waitFor(() => {
      const timeInput = screen.getByRole('spinbutton');
      fireEvent.change(timeInput, { target: { value: '1' } });
    });

    expect(screen.getByText('2分钟规则：立即执行！')).toBeInTheDocument();

    fireEvent.click(screen.getByText('继续'));

    // 应该直接跳到确认步骤
    await waitFor(() => {
      expect(screen.getByText('确认处理决策')).toBeInTheDocument();
      expect(screen.getByText('立即执行')).toBeInTheDocument();
    });
  });

  it('应该允许用户返回上一步', async () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 进入第二步
    fireEvent.click(screen.getByText('继续'));

    await waitFor(() => {
      expect(screen.getByText('需要行动吗？')).toBeInTheDocument();
    });

    // 点击上一步
    const backButton = screen.getByText('上一步');
    fireEvent.click(backButton);

    // 应该回到第一步
    await waitFor(() => {
      expect(screen.getByText('这是什么？')).toBeInTheDocument();
    });
  });

  it('应该显示处理错误', () => {
    mockUseGTDStore.mockReturnValue({
      processItem: mockProcessItem,
      contexts: mockContexts,
      processError: '处理失败：网络错误',
      clearProcessError: mockClearProcessError,
    } as any);

    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('处理失败：网络错误')).toBeInTheDocument();
  });

  it('应该在处理过程中显示加载状态', async () => {
    mockProcessItem.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 快速完成所有步骤到确认
    fireEvent.click(screen.getByText('继续'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('是，需要行动'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('继续'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('延迟处理'));
    });

    await waitFor(() => {
      const contextSelect = screen.getByLabelText('选择情境');
      fireEvent.change(contextSelect, { target: { value: 'context-1' } });
      fireEvent.click(screen.getByText('继续'));
    });

    await waitFor(() => {
      const confirmButton = screen.getByText('确认处理');
      fireEvent.click(confirmButton);
    });

    // 应该显示处理中状态
    expect(screen.getByText('处理中...')).toBeInTheDocument();

    // 确认按钮应该被禁用
    const processingButton = screen.getByText('处理中...');
    expect(processingButton).toBeDisabled();
  });

  it('应该验证必填字段', async () => {
    render(
      <ProcessingWizard
        item={mockItem}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 完成到分类步骤
    fireEvent.click(screen.getByText('继续'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('是，需要行动'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('继续'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('延迟处理'));
    });

    // 不选择情境，直接点击继续
    const continueButton = screen.getByText('继续');
    expect(continueButton).toBeDisabled();

    // 选择情境后应该启用
    const contextSelect = screen.getByLabelText('选择情境');
    fireEvent.change(contextSelect, { target: { value: 'context-1' } });

    expect(continueButton).not.toBeDisabled();
  });
});
