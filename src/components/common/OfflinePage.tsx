import React from 'react';
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface OfflinePageProps {
  onRetry?: () => void;
}

export const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <WifiIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              离线模式
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              您当前处于离线状态。您可以继续使用应用的基本功能。
            </p>
          </div>

          <div className="mt-6">
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    离线功能
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>您可以继续添加和编辑任务</li>
                      <li>所有更改将在重新连接时同步</li>
                      <li>某些功能可能受限</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {onRetry && (
            <div className="mt-6">
              <button
                onClick={onRetry}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                重试连接
              </button>
            </div>
          )}

          <div className="mt-6">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                网络连接恢复后，应用将自动同步您的数据
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
