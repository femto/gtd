import React, { useState, useEffect } from 'react';

export interface ErrorNotificationProps {
  error: Error | string | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  type?: 'error' | 'warning' | 'info';
}

/**
 * User-friendly error notification component
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  type = 'error',
}) => {
  const [isVisible, setIsVisible] = useState(!!error);

  useEffect(() => {
    setIsVisible(!!error);

    if (error && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !error) {
    return null;
  }

  const errorMessage = typeof error === 'string' ? error : error.message;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          text: 'text-yellow-800',
          button: 'text-yellow-500 hover:text-yellow-600',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          text: 'text-blue-800',
          button: 'text-blue-500 hover:text-blue-600',
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          text: 'text-red-800',
          button: 'text-red-500 hover:text-red-600',
        };
    }
  };

  const styles = getTypeStyles();

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm w-full z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <div className={`rounded-md border p-4 ${styles.container}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <div className={styles.icon}>{getIcon()}</div>
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>
              {errorMessage}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleDismiss}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
              >
                <span className="sr-only">关闭</span>
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing error notifications
 */
export const useErrorNotification = () => {
  const [error, setError] = useState<Error | string | null>(null);

  const showError = (error: Error | string) => {
    setError(error);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    showError,
    clearError,
  };
};

/**
 * Global error notification provider
 */
interface ErrorNotificationContextType {
  showError: (error: Error | string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ErrorNotificationContext =
  React.createContext<ErrorNotificationContextType | null>(null);

export const ErrorNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      error: Error | string;
      type: 'error' | 'warning' | 'info';
    }>
  >([]);

  const addNotification = (
    error: Error | string,
    type: 'error' | 'warning' | 'info'
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, error, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const showError = (error: Error | string) => addNotification(error, 'error');
  const showWarning = (message: string) => addNotification(message, 'warning');
  const showInfo = (message: string) => addNotification(message, 'info');

  return (
    <ErrorNotificationContext.Provider
      value={{ showError, showWarning, showInfo }}
    >
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{ transform: `translateY(${index * 10}px)` }}
          >
            <ErrorNotification
              error={notification.error}
              type={notification.type}
              onDismiss={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </ErrorNotificationContext.Provider>
  );
};

export const useGlobalErrorNotification = () => {
  const context = React.useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error(
      'useGlobalErrorNotification must be used within ErrorNotificationProvider'
    );
  }
  return context;
};
