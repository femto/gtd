/**
 * 多设备同步端到端测试
 * 测试多设备协调和同步状态显示功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceManager } from '../DeviceManager';
import { SyncStatus } from '../SyncStatus';
import { syncService } from '../../../services/sync-service';
import { syncAPI } from '../../../services/sync-api';
import type { DeviceInfo, SyncStats } from '../../../types/sync';

// Mock dependencies
vi.mock('../../../services/sync-api');
vi.mock('../../../services/sync-service');

// Mock sync state for tests
const mockSyncState = {
  status: 'success' as const,
  lastSyncTime: new Date('2023-01-01T10:00:00Z'),
  lastSuccessTime: new Date('2023-01-01T10:00:00Z'),
  pendingChanges: 3,
  conflictCount: 1,
  error: null,
  isAutoSyncEnabled: true,
  syncInterval: 300000,
};

describe('Multi-Device Sync E2E Tests', () => {
  const mockDevices: DeviceInfo[] = [
    {
      id: 'device-1',
      name: 'MacBook Pro',
      type: 'desktop',
      platform: 'macOS',
      lastSeen: new Date('2023-01-01T10:00:00Z'),
      isActive: true,
    },
    {
      id: 'device-2',
      name: 'iPhone 14',
      type: 'mobile',
      platform: 'iOS',
      lastSeen: new Date('2023-01-01T09:30:00Z'),
      isActive: false,
    },
    {
      id: 'device-3',
      name: 'iPad Air',
      type: 'tablet',
      platform: 'iPadOS',
      lastSeen: new Date('2023-01-01T08:00:00Z'),
      isActive: true,
    },
  ];

  // Removed unused mockSyncState variable

  const mockSyncStats: SyncStats = {
    totalSynced: 25,
    totalConflicts: 2,
    lastSyncDuration: 1500,
    averageSyncTime: 1200,
    syncHistory: [
      {
        timestamp: new Date('2023-01-01T10:00:00Z'),
        duration: 1500,
        changeCount: 5,
        success: true,
      },
      {
        timestamp: new Date('2023-01-01T09:55:00Z'),
        duration: 2000,
        changeCount: 3,
        success: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock sync API
    vi.mocked(syncAPI.getDevices).mockResolvedValue(mockDevices);
    vi.mocked(syncAPI.updateDevice).mockResolvedValue();

    // Mock sync service
    vi.mocked(syncService.getSyncState).mockReturnValue(mockSyncState);
    vi.mocked(syncService.getSyncStats).mockReturnValue(mockSyncStats);
    vi.mocked(syncService.getConflicts).mockResolvedValue([]);
    vi.mocked(syncService.fullSync).mockResolvedValue();
    vi.mocked(syncService.startAutoSync).mockImplementation(() => {});
    vi.mocked(syncService.stopAutoSync).mockImplementation(() => {});
    vi.mocked(syncService.on).mockImplementation(() => {});
    vi.mocked(syncService.off).mockImplementation(() => {});
  });

  describe('DeviceManager Component', () => {
    it('应该显示设备列表', async () => {
      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('已连接设备')).toBeInTheDocument();
      });

      // 检查设备显示
      expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      expect(screen.getByText('iPhone 14')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();

      // 检查当前设备标识
      expect(screen.getByText('当前设备')).toBeInTheDocument();

      // 检查设备状态
      expect(screen.getAllByText('在线')).toHaveLength(2);
      expect(screen.getByText('离线')).toBeInTheDocument();
    });

    it('应该显示设备类型和平台信息', async () => {
      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('桌面设备 • macOS')).toBeInTheDocument();
        expect(screen.getByText('移动设备 • iOS')).toBeInTheDocument();
        expect(screen.getByText('平板设备 • iPadOS')).toBeInTheDocument();
      });
    });

    it('应该显示最后活跃时间', async () => {
      // Mock current time
      const mockNow = new Date('2023-01-01T10:30:00Z');
      vi.setSystemTime(mockNow);

      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('刚刚')).toBeInTheDocument(); // device-1
        expect(screen.getByText('30分钟前')).toBeInTheDocument(); // device-2
        expect(screen.getByText('2小时前')).toBeInTheDocument(); // device-3
      });
    });

    it('应该支持编辑设备名称', async () => {
      const onDeviceUpdate = vi.fn();
      render(
        <DeviceManager
          currentDeviceId="device-1"
          onDeviceUpdate={onDeviceUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('iPhone 14')).toBeInTheDocument();
      });

      // 点击编辑按钮
      const editButtons = screen.getAllByText('编辑');
      fireEvent.click(editButtons[0]); // 编辑iPhone设备

      // 修改名称
      const nameInput = screen.getByDisplayValue('iPhone 14');
      fireEvent.change(nameInput, { target: { value: 'My iPhone' } });

      // 保存更改
      fireEvent.click(screen.getByText('保存'));

      await waitFor(() => {
        expect(syncAPI.updateDevice).toHaveBeenCalledWith('device-2', {
          name: 'My iPhone',
        });
        expect(onDeviceUpdate).toHaveBeenCalled();
      });
    });

    it('应该处理加载错误', async () => {
      vi.mocked(syncAPI.getDevices).mockRejectedValue(new Error('网络错误'));

      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
        expect(screen.getByText('网络错误')).toBeInTheDocument();
      });

      // 测试重试功能
      fireEvent.click(screen.getByText('重试'));
      expect(syncAPI.getDevices).toHaveBeenCalledTimes(2);
    });

    it('应该显示空状态', async () => {
      vi.mocked(syncAPI.getDevices).mockResolvedValue([]);

      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('暂无已连接设备')).toBeInTheDocument();
      });
    });
  });

  describe('SyncStatus Component', () => {
    it('应该显示同步状态', () => {
      render(<SyncStatus />);

      expect(screen.getByText('同步成功')).toBeInTheDocument();
      expect(screen.getByText('上次同步: 刚刚')).toBeInTheDocument();
    });

    it('应该显示同步统计', () => {
      render(<SyncStatus />);

      expect(screen.getByText('3')).toBeInTheDocument(); // 待同步更改
      expect(screen.getByText('25')).toBeInTheDocument(); // 总同步次数
      expect(screen.getByText('1')).toBeInTheDocument(); // 待解决冲突
    });

    it('应该支持手动同步', async () => {
      const onManualSync = vi.fn();
      render(<SyncStatus onManualSync={onManualSync} />);

      fireEvent.click(screen.getByText('立即同步'));

      await waitFor(() => {
        expect(syncService.fullSync).toHaveBeenCalled();
        expect(onManualSync).toHaveBeenCalled();
      });
    });

    it('应该支持切换自动同步', () => {
      render(<SyncStatus />);

      // 找到自动同步开关
      const autoSyncToggle = screen.getByRole('button', { name: /自动同步/ });
      fireEvent.click(autoSyncToggle);

      expect(syncService.stopAutoSync).toHaveBeenCalled();
    });

    it('应该显示错误状态', () => {
      const errorState = {
        ...mockSyncState,
        status: 'error' as const,
        error: '同步失败: 网络连接超时',
      };

      vi.mocked(syncService.getSyncState).mockReturnValue(errorState);

      render(<SyncStatus />);

      expect(screen.getByText('同步失败')).toBeInTheDocument();
      expect(screen.getByText('同步失败: 网络连接超时')).toBeInTheDocument();
    });

    it('应该显示冲突警告', async () => {
      const conflictState = {
        ...mockSyncState,
        conflictCount: 2,
      };

      vi.mocked(syncService.getSyncState).mockReturnValue(conflictState);
      vi.mocked(syncService.getConflicts).mockResolvedValue([
        {
          id: 'conflict-1',
          entityId: 'action-1',
          entityType: 'action',
          localVersion: {} as any,
          remoteVersion: {} as any,
        },
        {
          id: 'conflict-2',
          entityId: 'project-1',
          entityType: 'project',
          localVersion: {} as any,
          remoteVersion: {} as any,
        },
      ]);

      const onResolveConflict = vi.fn();
      render(<SyncStatus onResolveConflict={onResolveConflict} />);

      await waitFor(() => {
        expect(
          screen.getByText('发现 2 个数据冲突需要解决')
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('解决冲突'));
      expect(onResolveConflict).toHaveBeenCalledWith('conflict-1');
    });

    it('应该显示详细信息', () => {
      render(<SyncStatus />);

      // 展开详情
      fireEvent.click(screen.getByText('显示详情'));

      expect(screen.getByText('上次成功同步:')).toBeInTheDocument();
      expect(screen.getByText('同步间隔:')).toBeInTheDocument();
      expect(screen.getByText('5分钟')).toBeInTheDocument();
      expect(screen.getByText('上次同步耗时:')).toBeInTheDocument();
      expect(screen.getByText('1.5s')).toBeInTheDocument();
    });

    it('应该显示同步历史', () => {
      render(<SyncStatus />);

      // 展开详情
      fireEvent.click(screen.getByText('显示详情'));

      expect(screen.getByText('最近同步记录')).toBeInTheDocument();
      expect(screen.getByText('5 更改')).toBeInTheDocument();
      expect(screen.getByText('3 更改')).toBeInTheDocument();
    });

    it('应该在同步中时禁用手动同步按钮', () => {
      const syncingState = {
        ...mockSyncState,
        status: 'syncing' as const,
      };

      vi.mocked(syncService.getSyncState).mockReturnValue(syncingState);

      render(<SyncStatus />);

      const syncButton = screen.getByText('同步中...');
      expect(syncButton).toBeDisabled();
    });
  });

  describe('集成测试场景', () => {
    it('应该处理完整的多设备同步流程', async () => {
      // 模拟多设备环境
      render(
        <div>
          <DeviceManager currentDeviceId="device-1" />
          <SyncStatus />
        </div>
      );

      // 验证初始状态
      await waitFor(() => {
        expect(screen.getByText('已连接设备')).toBeInTheDocument();
        expect(screen.getByText('同步成功')).toBeInTheDocument();
      });

      // 模拟新设备连接
      const newDevice: DeviceInfo = {
        id: 'device-4',
        name: 'Android Phone',
        type: 'mobile',
        platform: 'Android',
        lastSeen: new Date(),
        isActive: true,
      };

      vi.mocked(syncAPI.getDevices).mockResolvedValue([
        ...mockDevices,
        newDevice,
      ]);

      // 刷新设备列表
      fireEvent.click(screen.getByText('刷新'));

      await waitFor(() => {
        expect(screen.getByText('Android Phone')).toBeInTheDocument();
      });

      // 触发手动同步
      fireEvent.click(screen.getByText('立即同步'));

      await waitFor(() => {
        expect(syncService.fullSync).toHaveBeenCalled();
      });
    });

    it('应该处理设备离线和重新连接', async () => {
      render(<DeviceManager currentDeviceId="device-1" />);

      await waitFor(() => {
        expect(screen.getByText('iPhone 14')).toBeInTheDocument();
        expect(screen.getByText('离线')).toBeInTheDocument();
      });

      // 模拟设备重新连接
      const updatedDevices = mockDevices.map((device) =>
        device.id === 'device-2'
          ? { ...device, isActive: true, lastSeen: new Date() }
          : device
      );

      vi.mocked(syncAPI.getDevices).mockResolvedValue(updatedDevices);

      // 刷新设备列表
      fireEvent.click(screen.getByText('刷新'));

      await waitFor(() => {
        expect(screen.getAllByText('在线')).toHaveLength(3);
      });
    });

    it('应该处理同步冲突解决流程', async () => {
      const onResolveConflict = vi.fn();

      // 模拟有冲突的状态
      const conflictState = {
        ...mockSyncState,
        status: 'conflict' as const,
        conflictCount: 1,
      };

      vi.mocked(syncService.getSyncState).mockReturnValue(conflictState);
      vi.mocked(syncService.getConflicts).mockResolvedValue([
        {
          id: 'conflict-1',
          entityId: 'action-1',
          entityType: 'action',
          localVersion: {} as any,
          remoteVersion: {} as any,
        },
      ]);

      render(<SyncStatus onResolveConflict={onResolveConflict} />);

      await waitFor(() => {
        expect(screen.getByText('存在冲突')).toBeInTheDocument();
        expect(
          screen.getByText('发现 1 个数据冲突需要解决')
        ).toBeInTheDocument();
      });

      // 解决冲突
      fireEvent.click(screen.getByText('解决冲突'));
      expect(onResolveConflict).toHaveBeenCalledWith('conflict-1');

      // 模拟冲突解决后的状态
      const resolvedState = {
        ...mockSyncState,
        status: 'success' as const,
        conflictCount: 0,
      };

      vi.mocked(syncService.getSyncState).mockReturnValue(resolvedState);
      vi.mocked(syncService.getConflicts).mockResolvedValue([]);

      // 重新渲染组件
      render(<SyncStatus />);

      expect(screen.getByText('同步成功')).toBeInTheDocument();
      expect(screen.queryByText('发现')).not.toBeInTheDocument();
    });
  });
});
