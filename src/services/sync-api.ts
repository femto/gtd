/**
 * 同步API服务
 * 处理与云端服务器的数据同步通信
 */

import type {
  SyncRequest,
  SyncResponse,
  SyncConfig,
  IncrementalSyncData,
  DeviceInfo,
  ConflictRecord,
} from '../types/sync';

/**
 * 同步API接口
 */
export interface ISyncAPI {
  /**
   * 初始化同步配置
   */
  initialize(config: SyncConfig): Promise<void>;

  /**
   * 执行完整同步
   */
  fullSync(request: SyncRequest): Promise<SyncResponse>;

  /**
   * 执行增量同步
   */
  incrementalSync(deviceId: string, since: Date): Promise<IncrementalSyncData>;

  /**
   * 推送本地更改
   */
  pushChanges(request: SyncRequest): Promise<SyncResponse>;

  /**
   * 拉取远程更改
   */
  pullChanges(deviceId: string, since?: Date): Promise<SyncResponse>;

  /**
   * 注册设备
   */
  registerDevice(device: DeviceInfo): Promise<void>;

  /**
   * 更新设备信息
   */
  updateDevice(deviceId: string, updates: Partial<DeviceInfo>): Promise<void>;

  /**
   * 获取设备列表
   */
  getDevices(): Promise<DeviceInfo[]>;

  /**
   * 解决冲突
   */
  resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    data?: any
  ): Promise<void>;

  /**
   * 获取冲突列表
   */
  getConflicts(): Promise<ConflictRecord[]>;

  /**
   * 检查连接状态
   */
  checkConnection(): Promise<boolean>;
}

/**
 * HTTP同步API实现
 */
export class HTTPSyncAPI implements ISyncAPI {
  private config: SyncConfig | null = null;
  private baseURL: string = '';

  async initialize(config: SyncConfig): Promise<void> {
    this.config = config;
    this.baseURL = config.apiEndpoint.replace(/\/$/, '');

    // 验证API连接
    await this.checkConnection();
  }

  async fullSync(request: SyncRequest): Promise<SyncResponse> {
    return this.makeRequest('/sync/full', 'POST', request);
  }

  async incrementalSync(
    deviceId: string,
    since: Date
  ): Promise<IncrementalSyncData> {
    const params = new URLSearchParams({
      deviceId,
      since: since.toISOString(),
    });

    return this.makeRequest(`/sync/incremental?${params}`, 'GET');
  }

  async pushChanges(request: SyncRequest): Promise<SyncResponse> {
    return this.makeRequest('/sync/push', 'POST', request);
  }

  async pullChanges(deviceId: string, since?: Date): Promise<SyncResponse> {
    const params = new URLSearchParams({ deviceId });
    if (since) {
      params.append('since', since.toISOString());
    }

    return this.makeRequest(`/sync/pull?${params}`, 'GET');
  }

  async registerDevice(device: DeviceInfo): Promise<void> {
    await this.makeRequest('/devices', 'POST', device);
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<DeviceInfo>
  ): Promise<void> {
    await this.makeRequest(`/devices/${deviceId}`, 'PATCH', updates);
  }

  async getDevices(): Promise<DeviceInfo[]> {
    return this.makeRequest('/devices', 'GET');
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    data?: any
  ): Promise<void> {
    await this.makeRequest(`/conflicts/${conflictId}/resolve`, 'POST', {
      resolution,
      data,
    });
  }

  async getConflicts(): Promise<ConflictRecord[]> {
    return this.makeRequest('/conflicts', 'GET');
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/health', 'GET');
      return true;
    } catch {
      return false;
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<any> {
    if (!this.config) {
      throw new Error('Sync API not initialized');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} ${error}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}

/**
 * 模拟同步API实现（用于开发和测试）
 */
export class MockSyncAPI implements ISyncAPI {
  private devices: DeviceInfo[] = [];
  private conflicts: ConflictRecord[] = [];

  async initialize(_config: SyncConfig): Promise<void> {
    // Mock implementation - no actual initialization needed
  }

  async fullSync(_request: SyncRequest): Promise<SyncResponse> {
    // 模拟网络延迟
    await this.delay(500);

    return {
      success: true,
      timestamp: new Date(),
      changes: [],
      conflicts: [],
    };
  }

  async incrementalSync(
    _deviceId: string,
    since: Date
  ): Promise<IncrementalSyncData> {
    await this.delay(200);

    return {
      since,
      changes: [],
      hasMore: false,
    };
  }

  async pushChanges(_request: SyncRequest): Promise<SyncResponse> {
    await this.delay(300);

    // Process changes (simplified for mock)
    // _request.changes would be processed here in real implementation

    return {
      success: true,
      timestamp: new Date(),
      changes: [],
      conflicts: [],
    };
  }

  async pullChanges(_deviceId: string, _since?: Date): Promise<SyncResponse> {
    await this.delay(300);

    return {
      success: true,
      timestamp: new Date(),
      changes: [],
      conflicts: [],
    };
  }

  async registerDevice(device: DeviceInfo): Promise<void> {
    await this.delay(100);

    const existingIndex = this.devices.findIndex((d) => d.id === device.id);
    if (existingIndex >= 0) {
      this.devices[existingIndex] = device;
    } else {
      this.devices.push(device);
    }
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<DeviceInfo>
  ): Promise<void> {
    await this.delay(100);

    const device = this.devices.find((d) => d.id === deviceId);
    if (device) {
      Object.assign(device, updates);
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    await this.delay(100);
    return [...this.devices];
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    _data?: any
  ): Promise<void> {
    await this.delay(100);

    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (conflict) {
      conflict.resolvedAt = new Date();
      conflict.resolution = resolution;
    }
  }

  async getConflicts(): Promise<ConflictRecord[]> {
    await this.delay(100);
    return [...this.conflicts];
  }

  async checkConnection(): Promise<boolean> {
    await this.delay(50);
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出默认实例
export const syncAPI: ISyncAPI =
  process.env.NODE_ENV === 'development'
    ? new MockSyncAPI()
    : new HTTPSyncAPI();
