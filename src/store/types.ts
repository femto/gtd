/**
 * 状态管理类型定义
 * 定义Zustand store的类型接口
 */

import type {
  InboxItem,
  Action,
  Project,
  Context,
  WaitingItem,
  CalendarItem,
  ProcessDecision,
  FilterCriteria,
  ReviewData,
  SearchResult,
} from '../types/interfaces';
import { ProjectStatus } from '../types/enums';

/**
 * 收集模块状态接口
 */
export interface CaptureState {
  inboxItems: InboxItem[];
  isCapturing: boolean;
  captureError: string | null;
}

/**
 * 收集模块操作接口
 */
export interface CaptureActions {
  addInboxItem: (
    item: Omit<InboxItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  getInboxItems: () => Promise<InboxItem[]>;
  markAsProcessed: (id: string) => Promise<void>;
  deleteInboxItem: (id: string) => Promise<void>;
  clearCaptureError: () => void;
}

/**
 * 处理模块状态接口
 */
export interface ProcessState {
  currentItem: InboxItem | null;
  processingDecision: ProcessDecision | null;
  isProcessing: boolean;
  processError: string | null;
}

/**
 * 处理模块操作接口
 */
export interface ProcessActions {
  setCurrentItem: (item: InboxItem | null) => void;
  setProcessingDecision: (decision: ProcessDecision | null) => void;
  processItem: (itemId: string, decision: ProcessDecision) => Promise<void>;
  clearProcessError: () => void;
}

/**
 * 组织模块状态接口
 */
export interface OrganizeState {
  actions: Action[];
  projects: Project[];
  contexts: Context[];
  waitingItems: WaitingItem[];
  calendarItems: CalendarItem[];
  selectedContext: string | null;
  selectedProject: string | null;
  filterCriteria: FilterCriteria | null;
  isLoading: boolean;
  organizeError: string | null;
}

/**
 * 组织模块操作接口
 */
export interface OrganizeActions {
  // Actions
  addAction: (
    action: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateAction: (id: string, updates: Partial<Action>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  getActionsByContext: (contextId: string) => Promise<Action[]>;
  getActionsByProject: (projectId: string) => Promise<Action[]>;

  // Projects
  addProject: (
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Contexts
  addContext: (
    context: Omit<Context, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateContext: (id: string, updates: Partial<Context>) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;

  // Waiting Items
  addWaitingItem: (
    item: Omit<WaitingItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateWaitingItem: (
    id: string,
    updates: Partial<WaitingItem>
  ) => Promise<void>;
  deleteWaitingItem: (id: string) => Promise<void>;

  // Calendar Items
  addCalendarItem: (
    item: Omit<CalendarItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateCalendarItem: (
    id: string,
    updates: Partial<CalendarItem>
  ) => Promise<void>;
  deleteCalendarItem: (id: string) => Promise<void>;

  // Filters and Selection
  setSelectedContext: (contextId: string | null) => void;
  setSelectedProject: (projectId: string | null) => void;
  setFilterCriteria: (criteria: FilterCriteria | null) => void;

  // Data Loading
  loadAllData: () => Promise<void>;
  clearOrganizeError: () => void;
}

/**
 * 执行模块状态接口
 */
export interface EngageState {
  todayActions: Action[];
  nextActions: Action[];
  currentAction: Action | null;
  completedToday: number;
  isEngaging: boolean;
  engageError: string | null;
}

/**
 * 执行模块操作接口
 */
export interface EngageActions {
  getTodayActions: () => Promise<Action[]>;
  getNextActions: (contextId?: string) => Promise<Action[]>;
  setCurrentAction: (action: Action | null) => void;
  completeAction: (id: string) => Promise<void>;
  updateActionProgress: (id: string, progress: number) => Promise<void>;
  refreshEngageData: () => Promise<void>;
  clearEngageError: () => void;
}

/**
 * 回顾模块状态接口
 */
export interface ReviewState {
  reviewData: ReviewData | null;
  isReviewing: boolean;
  lastReviewDate: Date | null;
  reviewError: string | null;
}

/**
 * 回顾模块操作接口
 */
export interface ReviewActions {
  generateWeeklyReview: () => Promise<ReviewData>;
  updateProjectStatus: (
    projectId: string,
    status: ProjectStatus
  ) => Promise<void>;
  cleanupCompletedItems: (olderThan: Date) => Promise<void>;
  setLastReviewDate: (date: Date) => void;
  clearReviewError: () => void;
}

/**
 * 搜索模块状态接口
 */
export interface SearchState {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
}

/**
 * 搜索模块操作接口
 */
export interface SearchActions {
  setSearchQuery: (query: string) => void;
  performSearch: (
    query: string,
    options?: {
      types?: ('action' | 'project' | 'waiting' | 'calendar' | 'inbox')[];
      limit?: number;
      filters?: FilterCriteria;
    }
  ) => Promise<SearchResult[]>;
  clearSearch: () => void;
  initializeSearchIndexes: () => void;
  updateSearchIndex: (
    type: 'actions' | 'projects' | 'waiting' | 'calendar' | 'inbox'
  ) => void;
  clearSearchError: () => void;
}

/**
 * 全局应用状态接口
 */
export interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  globalError: string | null;
}

/**
 * 全局应用操作接口
 */
export interface AppActions {
  initialize: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  setGlobalError: (error: string | null) => void;
  triggerNotificationCheck: () => void;
  reset: () => void;
}

/**
 * 完整的GTD Store接口
 */
export interface GTDStore
  extends CaptureState,
    CaptureActions,
    ProcessState,
    ProcessActions,
    OrganizeState,
    OrganizeActions,
    EngageState,
    EngageActions,
    ReviewState,
    ReviewActions,
    SearchState,
    SearchActions,
    AppState,
    AppActions {}
