import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useServiceWorker } from '../../utils/sw-utils';
import { VersionManager, type UpdateInfo } from '../../utils/version-manager';

export const UpdateNotification: React.FC = () => {
  const { updateAvailable, updateApp } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [rollbackAvailable, setRollbackAvailable] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setDismissed(false);
      checkForUpdateInfo();
    }

    // Check if rollback is available
    setRollbackAvailable(VersionManager.isRollbackAvailable());
  }, [updateAvailable]);

  const checkForUpdateInfo = async () => {
    try {
      const info = await VersionManager.checkForUpdates();
      setUpdateInfo(info);
    } catch (error) {
      console.error('Failed to get update info:', error);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      // Prepare for update (backup current state)
      await VersionManager.prepareForUpdate();

      // Perform the actual update
      await updateApp();

      // Complete update process
      if (updateInfo) {
        await VersionManager.completeUpdate({
          version: updateInfo.availableVersion,
          buildTime: new Date().toISOString(),
          features: updateInfo.releaseNotes,
          critical: updateInfo.critical,
        });
      }
    } catch (error) {
      console.error('Failed to update app:', error);
      setUpdating(false);
    }
  };

  const handleRollback = async () => {
    try {
      const success = await VersionManager.rollback();
      if (success) {
        window.location.reload();
      } else {
        alert('回滚失败，请刷新页面重试');
      }
    } catch (error) {
      console.error('Failed to rollback:', error);
      alert('回滚失败，请刷新页面重试');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!updateAvailable || dismissed) {
    // Show rollback option if available
    if (rollbackAvailable && !dismissed) {
      const rollbackInfo = VersionManager.getRollbackInfo();
      return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-white mr-3" />
              <div>
                <p className="text-white font-medium">检测到更新问题</p>
                <p className="text-yellow-200 text-sm">
                  可以回滚到之前的版本 {rollbackInfo?.version}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleRollback}
                className="bg-white text-yellow-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-600 focus:ring-white"
              >
                回滚版本
              </button>

              <button
                onClick={() => setRollbackAvailable(false)}
                className="text-yellow-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-600 focus:ring-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  const bgColor = updateInfo?.critical ? 'bg-red-600' : 'bg-indigo-600';
  const textColor = updateInfo?.critical ? 'text-red-200' : 'text-indigo-200';

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 ${bgColor} p-4`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            {updateInfo?.critical ? (
              <ExclamationTriangleIcon className="h-6 w-6 text-white mr-3" />
            ) : (
              <ArrowPathIcon className="h-6 w-6 text-white mr-3" />
            )}
            <div>
              <p className="text-white font-medium">
                {updateInfo?.critical ? '重要更新可用' : '新版本可用'}
                {updateInfo && (
                  <span className="ml-2 text-sm">
                    v{updateInfo.availableVersion}
                  </span>
                )}
              </p>
              <p className={`${textColor} text-sm`}>
                {updateInfo?.critical
                  ? '此更新包含重要安全修复，建议立即更新'
                  : '点击更新以获取最新功能和修复'}
                {updateInfo?.updateSize && (
                  <span className="ml-2">
                    ({(updateInfo.updateSize / 1024 / 1024).toFixed(1)}MB)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {updateInfo && updateInfo.releaseNotes.length > 0 && (
              <button
                onClick={() => setShowReleaseNotes(true)}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={handleUpdate}
              disabled={updating}
              className={`bg-white ${updateInfo?.critical ? 'text-red-600 hover:bg-red-50' : 'text-indigo-600 hover:bg-indigo-50'} px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white disabled:opacity-50`}
            >
              {updating ? (
                <div className="flex items-center">
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                  更新中...
                </div>
              ) : updateInfo?.critical ? (
                '立即更新'
              ) : (
                '更新'
              )}
            </button>

            {!updateInfo?.critical && (
              <button
                onClick={handleDismiss}
                className={`${textColor} hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white`}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Release Notes Modal */}
      {showReleaseNotes && updateInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowReleaseNotes(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      更新说明 v{updateInfo.availableVersion}
                    </h3>
                    <div className="mt-2">
                      <ul className="text-sm text-gray-500 space-y-2">
                        {updateInfo.releaseNotes.map((note, index) => (
                          <li key={index} className="flex items-start">
                            <span className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowReleaseNotes(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateNotification;
