/**
 * 设备管理组件
 * 显示和管理已连接的设备
 */

import React, { useState, useEffect } from 'react';
import { syncAPI } from '../../services/sync-api';
import type { DeviceInfo } from '../../types/sync';

interface DeviceManagerProps {
  currentDeviceId: string;
  onDeviceUpdate?: (device: DeviceInfo) => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  currentDeviceId,
  onDeviceUpdate,
}) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceList = await syncAPI.getDevices();
      setDevices(deviceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDevice = (device: DeviceInfo) => {
    setEditingDevice(device.id);
    setDeviceName(device.name);
  };

  const handleSaveDevice = async (deviceId: string) => {
    try {
      await syncAPI.updateDevice(deviceId, { name: deviceName });

      setDevices(
        devices.map((device) =>
          device.id === deviceId ? { ...device, name: deviceName } : device
        )
      );

      const updatedDevice = devices.find((d) => d.id === deviceId);
      if (updatedDevice && onDeviceUpdate) {
        onDeviceUpdate({ ...updatedDevice, name: deviceName });
      }

      setEditingDevice(null);
      setDeviceName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新设备失败');
    }
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    setDeviceName('');
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return '🖥️';
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      default:
        return '💻';
    }
  };

  const getDeviceTypeText = (type: string) => {
    switch (type) {
      case 'desktop':
        return '桌面设备';
      case 'mobile':
        return '移动设备';
      case 'tablet':
        return '平板设备';
      default:
        return '未知设备';
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载设备列表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">⚠️</div>
          <div className="ml-2">
            <h3 className="text-sm font-medium text-red-800">加载失败</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadDevices}
          className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">已连接设备</h3>
        <button
          onClick={loadDevices}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          刷新
        </button>
      </div>

      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`border rounded-lg p-4 ${
              device.id === currentDeviceId
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getDeviceIcon(device.type)}</span>
                <div>
                  {editingDevice === device.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        placeholder="设备名称"
                      />
                      <button
                        onClick={() => handleSaveDevice(device.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {device.name}
                        {device.id === currentDeviceId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            当前设备
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {getDeviceTypeText(device.type)} • {device.platform}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div
                    className={`flex items-center space-x-1 ${
                      device.isActive ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        device.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    ></div>
                    <span className="text-xs">
                      {device.isActive ? '在线' : '离线'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatLastSeen(device.lastSeen)}
                  </p>
                </div>

                {device.id !== currentDeviceId &&
                  editingDevice !== device.id && (
                    <button
                      onClick={() => handleEditDevice(device)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      编辑
                    </button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📱</div>
          <p>暂无已连接设备</p>
        </div>
      )}
    </div>
  );
};
