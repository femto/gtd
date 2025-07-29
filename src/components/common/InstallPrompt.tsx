import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { VersionManager } from '../../utils/version-manager';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [, setInstallSource] = useState<'browser' | 'standalone' | 'unknown'>(
    'unknown'
  );

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      // Check if running in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        setInstallSource('standalone');
        return;
      }

      // Check if running as installed PWA
      if ((navigator as any).standalone === true) {
        setIsInstalled(true);
        setInstallSource('standalone');
        return;
      }

      // Check if launched from home screen (Android)
      if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        setIsInstalled(true);
        setInstallSource('browser');
        return;
      }

      setInstallSource('browser');
    };

    checkInstallStatus();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user has previously dismissed the prompt
      const dismissedTime = localStorage.getItem('pwa-install-dismissed');
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

      if (!dismissedTime || now - parseInt(dismissedTime) > oneWeek) {
        // Only show if not already installed
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalled(true);

      // Track installation
      const currentVersion = VersionManager.getCurrentVersion();
      localStorage.setItem('pwa-install-date', new Date().toISOString());
      localStorage.setItem('pwa-install-version', currentVersion.version);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');

        // Track successful installation attempt
        localStorage.setItem('pwa-install-attempt', new Date().toISOString());
        localStorage.setItem('pwa-install-outcome', 'accepted');
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('pwa-install-outcome', 'dismissed');
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt failed:', error);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);

    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed, no prompt available, already dismissed, or not supported
  if (isInstalled || !showPrompt || dismissed || !deferredPrompt) {
    return null;
  }

  // Detect mobile device for better messaging
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isMobile ? (
              <DevicePhoneMobileIcon className="h-6 w-6 text-indigo-600" />
            ) : (
              <ArrowDownTrayIcon className="h-6 w-6 text-indigo-600" />
            )}
          </div>

          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">安装GTD工具</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isMobile
                ? '添加到主屏幕，像原生应用一样使用'
                : '将应用添加到桌面，获得更好的使用体验'}
            </p>

            <div className="mt-2 text-xs text-gray-400">
              <ul className="list-disc list-inside space-y-1">
                <li>离线访问</li>
                <li>更快的启动速度</li>
                <li>原生应用体验</li>
              </ul>
            </div>

            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleInstall}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isMobile ? '添加到主屏幕' : '安装应用'}
              </button>

              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                稍后
              </button>
            </div>
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
