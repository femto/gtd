import { useEffect, useState } from 'react';
import { QuickInput } from './components/capture/QuickInput';
import { InboxList } from './components/capture/InboxList';
import { ProcessingWizard } from './components/process/ProcessingWizard';
import { ContextManager } from './components/organize/ContextManager';
import { ProjectManager } from './components/organize/ProjectManager';
import { WaitingList } from './components/organize/WaitingList';
import { ScheduleView } from './components/organize/ScheduleView';
import { ContextualActionList } from './components/organize/ContextualActionList';
import { TodayView } from './components/engage/TodayView';
import { WeeklyReview } from './components/review/WeeklyReview';
import { UpdateNotification } from './components/common/UpdateNotification';
import { InstallPrompt } from './components/common/InstallPrompt';
import { OfflinePage } from './components/common/OfflinePage';
import { ResponsiveNavigation } from './components/common/ResponsiveNavigation';
import { ThemeProvider } from './contexts/ThemeContext';
import { useGTDStore } from './store/gtd-store';
import { useServiceWorker } from './utils/sw-utils';
import { useGestures } from './hooks/useGestures';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import {
  announceToScreenReader,
  addFocusVisiblePolyfill,
  createSkipLink,
} from './utils/accessibility';
import {
  createDefaultContexts,
  shouldInitializeDefaults,
} from './utils/default-data';
import type { InboxItem } from './types';
import './App.css';

type ViewType =
  | 'capture'
  | 'process'
  | 'contexts'
  | 'projects'
  | 'organize'
  | 'engage'
  | 'review';

function App() {
  const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('capture');
  const { isOffline } = useServiceWorker();
  const { initialize, isInitialized, contexts, addContext, getInboxItems } =
    useGTDStore();

  // Touch gesture support for navigation
  const gestureRef = useGestures({
    onSwipeLeft: () => {
      const views: ViewType[] = [
        'capture',
        'process',
        'contexts',
        'projects',
        'organize',
        'engage',
        'review',
      ];
      const currentIndex = views.indexOf(currentView);
      if (currentIndex < views.length - 1) {
        setCurrentView(views[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const views: ViewType[] = [
        'capture',
        'process',
        'contexts',
        'projects',
        'organize',
        'engage',
        'review',
      ];
      const currentIndex = views.indexOf(currentView);
      if (currentIndex > 0) {
        setCurrentView(views[currentIndex - 1]);
      }
    },
  });

  // Keyboard navigation for main app
  const { containerRef: appRef } = useKeyboardNavigation({
    onEscape: () => {
      if (processingItem) {
        handleProcessingCancel();
      }
    },
  });

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initialize();

        // 如果没有情境，创建默认情境
        if (shouldInitializeDefaults(contexts)) {
          const defaultContexts = createDefaultContexts();
          for (const contextData of defaultContexts) {
            await addContext(contextData);
          }
        }

        // Announce app ready to screen readers
        announceToScreenReader('GTD应用已准备就绪');
      } catch (error) {
        console.error('应用初始化失败:', error);
        announceToScreenReader('应用初始化失败，请刷新页面重试', 'assertive');
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [initialize, isInitialized, contexts, addContext]);

  // Initialize accessibility features
  useEffect(() => {
    addFocusVisiblePolyfill();

    // Add skip links
    const skipToMain = createSkipLink('main-content', '跳转到主要内容');
    const skipToNav = createSkipLink('main-navigation', '跳转到导航');

    document.body.insertBefore(skipToMain, document.body.firstChild);
    document.body.insertBefore(skipToNav, document.body.firstChild);

    return () => {
      // Cleanup skip links
      try {
        document.body.removeChild(skipToMain);
        document.body.removeChild(skipToNav);
      } catch {
        // Skip links may have already been removed
      }
    };
  }, []);

  const handleItemSelect = (item: InboxItem) => {
    console.log('选择项目:', item);
  };

  const handleItemProcess = (item: InboxItem) => {
    setProcessingItem(item);
  };

  const handleProcessingComplete = async () => {
    setProcessingItem(null);
    // 刷新工作篮数据
    await getInboxItems();
    announceToScreenReader('项目处理完成');
  };

  const handleProcessingCancel = () => {
    setProcessingItem(null);
    announceToScreenReader('取消项目处理');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    const viewNames = {
      capture: '收集',
      process: '处理',
      contexts: '情境管理',
      projects: '项目管理',
      organize: '组织',
      engage: '执行',
      review: '回顾',
    };
    announceToScreenReader(`切换到${viewNames[view]}页面`);
  };

  const OrganizeView = () => {
    const [activeTab, setActiveTab] = useState<
      'contexts' | 'projects' | 'actions' | 'waiting' | 'schedule'
    >('contexts');

    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="icon-container teal mr-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <h1 className="text-2xl sm:text-3xl section-title">组织管理</h1>
          </div>
          <p className="section-subtitle text-base sm:text-lg leading-relaxed">
            管理情境、项目，组织任务和日程安排，构建高效的工作系统
          </p>
        </div>

        {/* 标签导航 - 响应式 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('contexts')}
                className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'contexts'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                🏷️ 情境管理
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'projects'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                📋 项目管理
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'actions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                📝 按情境分类
              </button>
              <button
                onClick={() => setActiveTab('waiting')}
                className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'waiting'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                ⏳ 等待他人
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'schedule'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                📅 日程安排
              </button>
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="modern-card card-hover">
          {activeTab === 'contexts' && <ContextManager />}
          {activeTab === 'projects' && <ProjectManager />}
          {activeTab === 'actions' && <ContextualActionList />}
          {activeTab === 'waiting' && <WaitingList />}
          {activeTab === 'schedule' && <ScheduleView />}
        </div>
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto mb-6"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              正在初始化GTD系统
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              请稍候，正在加载您的任务管理工具...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ProcessView = () => {
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="icon-container orange mr-4">
              <span className="text-white text-xl">⚡</span>
            </div>
            <h1 className="text-2xl sm:text-3xl section-title">处理工作篮</h1>
          </div>
          <p className="section-subtitle text-base sm:text-lg leading-relaxed">
            对工作篮中的每个项目进行GTD处理决策，让任务井然有序
          </p>
        </div>

        <div className="modern-card card-hover overflow-hidden">
          <InboxList
            onItemSelect={handleItemSelect}
            onItemProcess={handleItemProcess}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'process':
        return <ProcessView />;
      case 'contexts':
        return <ContextManager />;
      case 'projects':
        return <ProjectManager />;
      case 'organize':
        return <OrganizeView />;
      case 'engage':
        return <TodayView />;
      case 'review':
        return <WeeklyReview />;
      case 'capture':
      default:
        return (
          <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="icon-container blue mr-4">
                  <span className="text-white text-xl">💡</span>
                </div>
                <h1 className="text-2xl sm:text-3xl section-title">收集想法</h1>
              </div>
              <p className="section-subtitle text-base sm:text-lg leading-relaxed">
                快速记录所有想法、任务和承诺到工作篮，让您的大脑保持清醒
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 快速输入区域 */}
              <div className="space-y-6">
                <div className="modern-card card-hover">
                  <div className="flex items-center mb-6">
                    <div className="icon-container purple mr-4">
                      <span className="text-white text-xl">📝</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      快速收集
                    </h2>
                  </div>
                  <QuickInput />
                </div>
              </div>

              {/* 工作篮区域 */}
              <div className="space-y-6">
                <div className="modern-card card-hover overflow-hidden">
                  <div className="pb-6 border-b border-gray-200 dark:border-gray-700 mb-6">
                    <div className="flex items-center">
                      <div className="icon-container green mr-4">
                        <span className="text-white text-xl">📥</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        工作篮
                      </h2>
                    </div>
                  </div>
                  <div className="-mx-6 -mb-6">
                    <InboxList
                      onItemSelect={handleItemSelect}
                      onItemProcess={handleItemProcess}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Show offline page if completely offline and no cached data
  if (isOffline && !isInitialized) {
    return <OfflinePage onRetry={() => window.location.reload()} />;
  }

  return (
    <ThemeProvider>
      <div
        ref={(el) => {
          if (gestureRef.current !== el) gestureRef.current = el;
          if (appRef.current !== el) appRef.current = el;
        }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-colors duration-200"
      >
        {/* PWA Components */}
        <UpdateNotification />
        <InstallPrompt />

        {/* 响应式导航栏 */}
        <div id="main-navigation">
          <ResponsiveNavigation
            currentView={currentView}
            onViewChange={handleViewChange}
            isOffline={isOffline}
          />
        </div>

        {/* 主要内容 */}
        <main
          id="main-content"
          className="pb-safe-bottom"
          role="main"
          aria-label="主要内容区域"
        >
          {renderContent()}
        </main>

        {/* 处理向导 */}
        {processingItem && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="processing-wizard-title"
          >
            <ProcessingWizard
              item={processingItem}
              onComplete={handleProcessingComplete}
              onCancel={handleProcessingCancel}
            />
          </div>
        )}

        {/* Screen reader only status region */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="status-region"
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
