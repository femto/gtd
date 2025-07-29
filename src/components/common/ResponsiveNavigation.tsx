import React, { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

type ViewType =
  | 'capture'
  | 'process'
  | 'contexts'
  | 'projects'
  | 'organize'
  | 'engage'
  | 'review';

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOffline?: boolean;
}

export const ResponsiveNavigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  isOffline = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'capture', label: '收集', icon: '📥' },
    { id: 'process', label: '处理', icon: '⚡' },
    { id: 'organize', label: '组织', icon: '📊' },
    { id: 'engage', label: '执行', icon: '✅' },
    { id: 'review', label: '回顾', icon: '🔄' },
  ] as const;

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 shadow-lg backdrop-blur-sm sticky top-0 z-50"
      role="navigation"
      aria-label="主导航"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  GTD
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">GTD 工具</h1>
            </div>
            {isOffline && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900 shadow-sm"
                role="status"
                aria-label="当前处于离线模式"
              >
                离线模式
              </span>
            )}
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-2" role="menubar">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id as ViewType)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 ${
                  currentView === item.id
                    ? 'bg-white bg-opacity-20 backdrop-blur-sm text-white shadow-lg border border-white border-opacity-20'
                    : 'text-white text-opacity-80 hover:text-white hover:bg-white hover:bg-opacity-10'
                }`}
                aria-current={currentView === item.id ? 'page' : undefined}
                role="menuitem"
                aria-label={`切换到${item.label}页面`}
              >
                <span className="mr-2" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
            <div className="ml-4">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? '关闭主菜单' : '打开主菜单'}
              aria-controls="mobile-menu"
            >
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
        role="menu"
        aria-labelledby="mobile-menu-button"
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gradient-to-b from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 border-t border-white border-opacity-20">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as ViewType)}
              className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 ${
                currentView === item.id
                  ? 'bg-white bg-opacity-20 backdrop-blur-sm text-white shadow-lg border border-white border-opacity-20'
                  : 'text-white text-opacity-80 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
              aria-current={currentView === item.id ? 'page' : undefined}
              role="menuitem"
              aria-label={`切换到${item.label}页面`}
            >
              <span className="mr-3" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
