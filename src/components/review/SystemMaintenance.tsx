/**
 * 系统维护组件
 * 提供数据清理、导出导入、系统健康检查等功能
 */

import React, { useState, useEffect } from 'react';
import { maintenanceService } from '../../utils/maintenance';
import type {
  SystemHealthCheck,
  CleanupOptions,
  CleanupResult,
  ExportData,
} from '../../utils/maintenance';

interface SystemMaintenanceProps {
  onClose?: () => void;
}

export const SystemMaintenance: React.FC<SystemMaintenanceProps> = ({
  onClose,
}) => {
  const [currentTab, setCurrentTab] = useState<'health' | 'cleanup' | 'backup'>(
    'health'
  );
  const [healthCheck, setHealthCheck] = useState<SystemHealthCheck | null>(
    null
  );
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>({
    deleteCompletedActions: false,
    deleteCompletedProjects: false,
    deleteProcessedInboxItems: false,
    deleteCancelledItems: false,
    olderThanDays: 30,
    dryRun: true,
  });
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(
    null
  );
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentTab === 'health') {
      performHealthCheck();
    }
  }, [currentTab]);

  const performHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await maintenanceService.performHealthCheck();
      setHealthCheck(result);
    } catch (error) {
      console.error('健康检查失败:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const result = await maintenanceService.cleanupData(cleanupOptions);
      setCleanupResult(result);

      // 如果不是预览模式，重新执行健康检查
      if (!cleanupOptions.dryRun) {
        await performHealthCheck();
      }
    } catch (error) {
      console.error('数据清理失败:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await maintenanceService.downloadBackup();
    } catch (error) {
      console.error('数据导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const text = await importFile.text();
      const data: ExportData = JSON.parse(text);

      const result = await maintenanceService.importData(data, {
        overwrite: false,
      });

      alert(
        `导入完成！\n导入: ${result.imported} 条记录\n跳过: ${result.skipped} 条记录\n错误: ${result.errors.length} 个`
      );

      if (result.errors.length > 0) {
        console.error('导入错误:', result.errors);
      }

      // 重新执行健康检查
      await performHealthCheck();
    } catch (error) {
      console.error('数据导入失败:', error);
      alert('数据导入失败，请检查文件格式');
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  };

  const renderHealthCheck = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">系统健康检查</h3>
        <button
          onClick={performHealthCheck}
          disabled={isCheckingHealth}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCheckingHealth ? '检查中...' : '重新检查'}
        </button>
      </div>

      {isCheckingHealth ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">正在检查系统健康状况...</span>
        </div>
      ) : healthCheck ? (
        <div className="space-y-6">
          {/* 整体状态 */}
          <div
            className={`p-4 rounded-lg border ${getHealthStatusColor(healthCheck.status)}`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {getHealthStatusIcon(healthCheck.status)}
              </span>
              <div>
                <h4 className="font-semibold">
                  系统状态:{' '}
                  {healthCheck.status === 'healthy'
                    ? '健康'
                    : healthCheck.status === 'warning'
                      ? '警告'
                      : '严重'}
                </h4>
                <p className="text-sm opacity-75">
                  检查时间: {healthCheck.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-4">系统统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {healthCheck.statistics.totalActions}
                </div>
                <div className="text-sm text-gray-600">总行动数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {healthCheck.statistics.totalProjects}
                </div>
                <div className="text-sm text-gray-600">总项目数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {healthCheck.statistics.completedActions}
                </div>
                <div className="text-sm text-gray-600">已完成行动</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {healthCheck.statistics.unprocessedInboxItems}
                </div>
                <div className="text-sm text-gray-600">未处理收集</div>
              </div>
            </div>
          </div>

          {/* 问题列表 */}
          {healthCheck.issues.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-4">发现的问题</h4>
              <div className="space-y-3">
                {healthCheck.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      issue.type === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">
                        {issue.type === 'error' ? '❌' : '⚠️'}
                      </span>
                      <div className="flex-1">
                        <h5
                          className={`font-medium ${
                            issue.type === 'error'
                              ? 'text-red-900'
                              : 'text-yellow-900'
                          }`}
                        >
                          {issue.message}
                        </h5>
                        {issue.details && (
                          <p
                            className={`text-sm mt-1 ${
                              issue.type === 'error'
                                ? 'text-red-700'
                                : 'text-yellow-700'
                            }`}
                          >
                            {issue.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 建议 */}
          {healthCheck.recommendations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-4">改进建议</h4>
              <ul className="space-y-2">
                {healthCheck.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">💡</span>
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const renderCleanup = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">数据清理</h3>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-4">清理选项</h4>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="deleteCompletedActions"
              checked={cleanupOptions.deleteCompletedActions}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  deleteCompletedActions: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="deleteCompletedActions"
              className="text-sm text-gray-700"
            >
              删除已完成的行动
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="deleteCompletedProjects"
              checked={cleanupOptions.deleteCompletedProjects}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  deleteCompletedProjects: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="deleteCompletedProjects"
              className="text-sm text-gray-700"
            >
              删除已完成的项目
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="deleteProcessedInboxItems"
              checked={cleanupOptions.deleteProcessedInboxItems}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  deleteProcessedInboxItems: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="deleteProcessedInboxItems"
              className="text-sm text-gray-700"
            >
              删除已处理的工作篮项目
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="deleteCancelledItems"
              checked={cleanupOptions.deleteCancelledItems}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  deleteCancelledItems: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="deleteCancelledItems"
              className="text-sm text-gray-700"
            >
              删除已取消的项目和行动
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <label htmlFor="olderThanDays" className="text-sm text-gray-700">
              删除超过
            </label>
            <input
              type="number"
              id="olderThanDays"
              value={cleanupOptions.olderThanDays}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  olderThanDays: parseInt(e.target.value) || 30,
                }))
              }
              min="1"
              max="365"
              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label htmlFor="olderThanDays" className="text-sm text-gray-700">
              天的数据
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="dryRun"
              checked={cleanupOptions.dryRun}
              onChange={(e) =>
                setCleanupOptions((prev) => ({
                  ...prev,
                  dryRun: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="dryRun" className="text-sm text-gray-700">
              仅预览（不实际删除）
            </label>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              cleanupOptions.dryRun
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCleaningUp
              ? '处理中...'
              : cleanupOptions.dryRun
                ? '预览清理'
                : '执行清理'}
          </button>
        </div>
      </div>

      {cleanupResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            {cleanupOptions.dryRun ? '清理预览结果' : '清理结果'}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {cleanupResult.deletedActions}
              </div>
              <div className="text-sm text-gray-600">行动</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {cleanupResult.deletedProjects}
              </div>
              <div className="text-sm text-gray-600">项目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {cleanupResult.deletedInboxItems}
              </div>
              <div className="text-sm text-gray-600">工作篮项目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(cleanupResult.freedSpace / 1024)}KB
              </div>
              <div className="text-sm text-gray-600">释放空间</div>
            </div>
          </div>

          {cleanupResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-medium text-red-900 mb-2">错误信息</h5>
              <ul className="text-sm text-red-700 space-y-1">
                {cleanupResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">数据备份与恢复</h3>

      {/* 导出数据 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-4">导出数据</h4>
        <p className="text-sm text-gray-600 mb-4">
          将所有GTD数据导出为JSON文件，可用于备份或迁移到其他设备。
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出数据'}
        </button>
      </div>

      {/* 导入数据 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-4">导入数据</h4>
        <p className="text-sm text-gray-600 mb-4">
          从之前导出的JSON文件中恢复数据。重复的数据将被跳过。
        </p>

        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!importFile || isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? '导入中...' : '导入数据'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️
            导入数据前建议先导出当前数据作为备份。导入过程中重复的数据将被跳过，不会覆盖现有数据。
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">系统维护</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="mt-4 flex space-x-1">
            {[
              { key: 'health', label: '健康检查' },
              { key: 'cleanup', label: '数据清理' },
              { key: 'backup', label: '备份恢复' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCurrentTab(key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {currentTab === 'health' && renderHealthCheck()}
          {currentTab === 'cleanup' && renderCleanup()}
          {currentTab === 'backup' && renderBackup()}
        </div>
      </div>
    </div>
  );
};
