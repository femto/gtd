/**
 * SystemMaintenance组件测试
 */

// React is used via JSX transform
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SystemMaintenance } from '../SystemMaintenance';
import { maintenanceService } from '../../../utils/maintenance';
import type {
  SystemHealthCheck,
  CleanupResult,
} from '../../../utils/maintenance';

// Mock the maintenance service
vi.mock('../../../utils/maintenance');

const mockMaintenanceService = vi.mocked(maintenanceService);

describe('SystemMaintenance', () => {
  const mockHealthCheck: SystemHealthCheck = {
    timestamp: new Date('2024-01-15T10:00:00Z'),
    status: 'warning',
    issues: [
      {
        type: 'warning',
        category: 'data',
        message: '工作篮中有未处理的项目',
        details: '5 个项目需要处理',
        count: 5,
      },
      {
        type: 'error',
        category: 'integrity',
        message: '存在孤立的行动',
        details: '2 个行动关联的情境或项目不存在',
        count: 2,
      },
    ],
    statistics: {
      totalActions: 25,
      totalProjects: 8,
      totalContexts: 6,
      totalInboxItems: 12,
      completedActions: 15,
      completedProjects: 3,
      unprocessedInboxItems: 5,
      overdueActions: 2,
      projectsWithoutNextActions: 1,
      orphanedActions: 2,
      inactiveContexts: 1,
      dataSize: 1024 * 1024, // 1MB
    },
    recommendations: [
      '定期清空工作篮，处理所有收集的项目',
      '检查并更新过期行动的截止日期或完成状态',
      '清理或重新分配孤立的行动',
    ],
  };

  const mockCleanupResult: CleanupResult = {
    deletedActions: 10,
    deletedProjects: 2,
    deletedInboxItems: 5,
    freedSpace: 2048,
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaintenanceService.performHealthCheck.mockResolvedValue(
      mockHealthCheck
    );
    mockMaintenanceService.cleanupData.mockResolvedValue(mockCleanupResult);
    mockMaintenanceService.downloadBackup.mockResolvedValue(undefined);
    mockMaintenanceService.importData.mockResolvedValue({
      imported: 15,
      skipped: 3,
      errors: [],
    });
  });

  describe('渲染和导航', () => {
    it('应该正确渲染组件标题和标签页', () => {
      render(<SystemMaintenance />);

      expect(screen.getByText('系统维护')).toBeInTheDocument();
      expect(screen.getByText('健康检查')).toBeInTheDocument();
      expect(screen.getByText('数据清理')).toBeInTheDocument();
      expect(screen.getByText('备份恢复')).toBeInTheDocument();
    });

    it('应该显示关闭按钮当提供onClose回调时', () => {
      const mockOnClose = vi.fn();
      render(<SystemMaintenance onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('应该能够在不同标签页之间切换', () => {
      render(<SystemMaintenance />);

      // 默认显示健康检查
      expect(screen.getByText('系统健康检查')).toBeInTheDocument();

      // 切换到数据清理
      fireEvent.click(screen.getByText('数据清理'));
      expect(screen.getByText('清理选项')).toBeInTheDocument();

      // 切换到备份恢复
      fireEvent.click(screen.getByText('备份恢复'));
      expect(screen.getByText('数据备份与恢复')).toBeInTheDocument();
    });

    it('应该正确高亮当前活跃的标签页', () => {
      render(<SystemMaintenance />);

      const healthTab = screen.getByText('健康检查');
      const cleanupTab = screen.getByText('数据清理');

      // 默认健康检查标签页应该是活跃的
      expect(healthTab).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(cleanupTab).toHaveClass('text-gray-500');

      // 点击数据清理标签页
      fireEvent.click(cleanupTab);

      expect(cleanupTab).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(healthTab).toHaveClass('text-gray-500');
    });
  });

  describe('健康检查功能', () => {
    it('应该在组件挂载时自动执行健康检查', async () => {
      render(<SystemMaintenance />);

      await waitFor(() => {
        expect(mockMaintenanceService.performHealthCheck).toHaveBeenCalledTimes(
          1
        );
      });
    });

    it('应该显示加载状态', () => {
      mockMaintenanceService.performHealthCheck.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockHealthCheck), 1000)
          )
      );

      render(<SystemMaintenance />);

      expect(screen.getByText('正在检查系统健康状况...')).toBeInTheDocument();
    });

    it('应该显示健康检查结果', async () => {
      render(<SystemMaintenance />);

      await waitFor(() => {
        expect(screen.getByText('系统状态: 警告')).toBeInTheDocument();
      });

      // 检查统计信息
      expect(screen.getByText('25')).toBeInTheDocument(); // 总行动数
      expect(screen.getByText('8')).toBeInTheDocument(); // 总项目数
      expect(screen.getByText('15')).toBeInTheDocument(); // 已完成行动
      expect(screen.getByText('5')).toBeInTheDocument(); // 未处理收集

      // 检查问题列表
      expect(screen.getByText('发现的问题')).toBeInTheDocument();
      expect(screen.getByText('工作篮中有未处理的项目')).toBeInTheDocument();
      expect(screen.getByText('存在孤立的行动')).toBeInTheDocument();

      // 检查建议
      expect(screen.getByText('改进建议')).toBeInTheDocument();
      expect(
        screen.getByText('定期清空工作篮，处理所有收集的项目')
      ).toBeInTheDocument();
    });

    it('应该能够手动重新执行健康检查', async () => {
      render(<SystemMaintenance />);

      await waitFor(() => {
        expect(mockMaintenanceService.performHealthCheck).toHaveBeenCalledTimes(
          1
        );
      });

      const recheckButton = screen.getByText('重新检查');
      fireEvent.click(recheckButton);

      await waitFor(() => {
        expect(mockMaintenanceService.performHealthCheck).toHaveBeenCalledTimes(
          2
        );
      });
    });

    it('应该正确显示不同的健康状态', async () => {
      // 测试健康状态
      const healthyCheck = {
        ...mockHealthCheck,
        status: 'healthy' as const,
        issues: [],
      };
      mockMaintenanceService.performHealthCheck.mockResolvedValueOnce(
        healthyCheck
      );

      render(<SystemMaintenance />);

      await waitFor(() => {
        expect(screen.getByText('系统状态: 健康')).toBeInTheDocument();
        expect(screen.getByText('✅')).toBeInTheDocument();
      });
    });

    it('应该正确显示严重状态', async () => {
      const criticalCheck = { ...mockHealthCheck, status: 'critical' as const };
      mockMaintenanceService.performHealthCheck.mockResolvedValueOnce(
        criticalCheck
      );

      render(<SystemMaintenance />);

      await waitFor(() => {
        expect(screen.getByText('系统状态: 严重')).toBeInTheDocument();
        // 检查状态图标（第一个❌是状态图标）
        const statusIcons = screen.getAllByText('❌');
        expect(statusIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('数据清理功能', () => {
    beforeEach(() => {
      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('数据清理'));
    });

    it('应该显示清理选项', () => {
      expect(screen.getByText('清理选项')).toBeInTheDocument();
      expect(screen.getByLabelText('删除已完成的行动')).toBeInTheDocument();
      expect(screen.getByLabelText('删除已完成的项目')).toBeInTheDocument();
      expect(
        screen.getByLabelText('删除已处理的工作篮项目')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('删除已取消的项目和行动')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('仅预览（不实际删除）')).toBeInTheDocument();
    });

    it('应该能够切换清理选项', () => {
      const completedActionsCheckbox =
        screen.getByLabelText('删除已完成的行动');

      expect(completedActionsCheckbox).not.toBeChecked();

      fireEvent.click(completedActionsCheckbox);
      expect(completedActionsCheckbox).toBeChecked();
    });

    it('应该能够设置清理天数', () => {
      const daysInput = screen.getByDisplayValue('30');

      fireEvent.change(daysInput, { target: { value: '60' } });
      expect(daysInput).toHaveValue(60);
    });

    it('应该能够执行预览清理', async () => {
      const previewButton = screen.getByText('预览清理');

      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(mockMaintenanceService.cleanupData).toHaveBeenCalledWith({
          deleteCompletedActions: false,
          deleteCompletedProjects: false,
          deleteProcessedInboxItems: false,
          deleteCancelledItems: false,
          olderThanDays: 30,
          dryRun: true,
        });
      });

      // 检查预览结果
      expect(screen.getByText('清理预览结果')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // 删除的行动数
      expect(screen.getByText('2')).toBeInTheDocument(); // 删除的项目数
      expect(screen.getByText('5')).toBeInTheDocument(); // 删除的工作篮项目数
    });

    it('应该能够执行实际清理', async () => {
      // 取消预览模式
      const dryRunCheckbox = screen.getByLabelText('仅预览（不实际删除）');
      fireEvent.click(dryRunCheckbox);

      const executeButton = screen.getByText('执行清理');
      expect(executeButton).toHaveClass('bg-red-600'); // 应该是红色按钮

      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockMaintenanceService.cleanupData).toHaveBeenCalledWith({
          deleteCompletedActions: false,
          deleteCompletedProjects: false,
          deleteProcessedInboxItems: false,
          deleteCancelledItems: false,
          olderThanDays: 30,
          dryRun: false,
        });
      });

      // 检查清理结果
      expect(screen.getByText('清理结果')).toBeInTheDocument();
    });

    it('应该显示清理错误', async () => {
      const errorResult = {
        ...mockCleanupResult,
        errors: ['删除行动失败', '权限不足'],
      };
      mockMaintenanceService.cleanupData.mockResolvedValueOnce(errorResult);

      const previewButton = screen.getByText('预览清理');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('错误信息')).toBeInTheDocument();
        expect(screen.getByText('• 删除行动失败')).toBeInTheDocument();
        expect(screen.getByText('• 权限不足')).toBeInTheDocument();
      });
    });
  });

  describe('备份恢复功能', () => {
    beforeEach(() => {
      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('备份恢复'));
    });

    it('应该显示导出和导入选项', () => {
      // 检查标题
      const exportHeaders = screen.getAllByText('导出数据');
      const importHeaders = screen.getAllByText('导入数据');
      expect(exportHeaders.length).toBeGreaterThan(0);
      expect(importHeaders.length).toBeGreaterThan(0);

      // 检查按钮
      expect(
        screen.getByRole('button', { name: '导出数据' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '导入数据' })
      ).toBeInTheDocument();
    });

    it('应该能够导出数据', async () => {
      const exportButton = screen.getByText('导出数据', { selector: 'button' });

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockMaintenanceService.downloadBackup).toHaveBeenCalledTimes(1);
      });
    });

    it('应该能够选择导入文件', () => {
      const fileInput = document.querySelector('input[type="file"]');

      expect(fileInput).toBeInTheDocument();

      const file = new File(['{"version":"1.0.0"}'], 'backup.json', {
        type: 'application/json',
      });

      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [file] } });
      }
    });

    it('应该在选择文件后启用导入按钮', () => {
      const fileInput = document.querySelector('input[type="file"]');
      const importButton = screen.getByRole('button', { name: '导入数据' });

      expect(importButton).toBeDisabled();

      const file = new File(['{"version":"1.0.0"}'], 'backup.json', {
        type: 'application/json',
      });

      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [file] } });
        expect(importButton).not.toBeDisabled();
      }
    });

    it('应该显示导入警告信息', () => {
      expect(
        screen.getByText(/导入数据前建议先导出当前数据作为备份/)
      ).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该在健康检查时显示加载状态', () => {
      mockMaintenanceService.performHealthCheck.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockHealthCheck), 100)
          )
      );

      render(<SystemMaintenance />);

      expect(screen.getByText('检查中...')).toBeInTheDocument();
    });

    it('应该在清理时显示加载状态', async () => {
      mockMaintenanceService.cleanupData.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockCleanupResult), 100)
          )
      );

      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('数据清理'));

      const previewButton = screen.getByText('预览清理');
      fireEvent.click(previewButton);

      expect(screen.getByText('处理中...')).toBeInTheDocument();
    });

    it('应该在导出时显示加载状态', async () => {
      mockMaintenanceService.downloadBackup.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('备份恢复'));

      const exportButton = screen.getByText('导出数据', { selector: 'button' });
      fireEvent.click(exportButton);

      expect(screen.getByText('导出中...')).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该处理健康检查失败', async () => {
      mockMaintenanceService.performHealthCheck.mockRejectedValueOnce(
        new Error('检查失败')
      );

      render(<SystemMaintenance />);

      // 应该不会崩溃，错误会被捕获
      await waitFor(() => {
        expect(mockMaintenanceService.performHealthCheck).toHaveBeenCalledTimes(
          1
        );
      });
    });

    it('应该处理清理失败', async () => {
      mockMaintenanceService.cleanupData.mockRejectedValueOnce(
        new Error('清理失败')
      );

      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('数据清理'));

      const previewButton = screen.getByText('预览清理');
      fireEvent.click(previewButton);

      // 应该不会崩溃，错误会被捕获
      await waitFor(() => {
        expect(mockMaintenanceService.cleanupData).toHaveBeenCalledTimes(1);
      });
    });

    it('应该处理导出失败', async () => {
      mockMaintenanceService.downloadBackup.mockRejectedValueOnce(
        new Error('导出失败')
      );

      render(<SystemMaintenance />);
      fireEvent.click(screen.getByText('备份恢复'));

      const exportButton = screen.getByText('导出数据', { selector: 'button' });
      fireEvent.click(exportButton);

      // 应该不会崩溃，错误会被捕获
      await waitFor(() => {
        expect(mockMaintenanceService.downloadBackup).toHaveBeenCalledTimes(1);
      });
    });
  });
});
