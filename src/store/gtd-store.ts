/**
 * GTD工具主状态管理Store
 * 使用Zustand实现全局状态管理
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GTDStore } from './types';
import type {
  InboxItem,
  Action,
  Project,
  Context,
  WaitingItem,
  CalendarItem,
  // ProcessDecision,
  ReviewData,
  // SearchResult,
  // FilterCriteria
} from '../types/interfaces';
import { ActionStatus, ProjectStatus, ActionType } from '../types/enums';
import { generateId } from '../utils/validation';
import { notificationService } from '../utils/notification-service';
import { searchService } from '../utils/search-service';
import { syncService } from '../services/sync-service';

// 数据访问层
import { inboxDao } from '../database/dao/inbox-dao';
import { contextDao } from '../database/dao/context-dao';
import { projectDao } from '../database/dao/project-dao';
import { actionDao } from '../database/dao/action-dao';

/**
 * GTD Store实现
 */
export const useGTDStore = create<GTDStore>()(
  persist(
    (set, get) => ({
      // ===== 收集模块状态 =====
      inboxItems: [],
      isCapturing: false,
      captureError: null,

      // ===== 收集模块操作 =====
      addInboxItem: async (itemData) => {
        set({ isCapturing: true, captureError: null });

        try {
          const newItem: InboxItem = {
            ...itemData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            processed: false,
          };

          await inboxDao.create(newItem);

          set((state) => ({
            inboxItems: [...state.inboxItems, newItem],
            isCapturing: false,
          }));

          // 记录同步更改
          await syncService.recordLocalChange(
            'inbox_item',
            newItem.id,
            'create',
            newItem
          );

          // 更新搜索索引
          get().updateSearchIndex('inbox');
        } catch (error) {
          set({
            isCapturing: false,
            captureError:
              error instanceof Error ? error.message : '添加项目失败',
          });
          throw error;
        }
      },

      getInboxItems: async () => {
        try {
          const inboxItems = await inboxDao.getAll();
          set({ inboxItems });
          return inboxItems;
        } catch (error) {
          set({
            captureError:
              error instanceof Error ? error.message : '获取工作篮失败',
          });
          throw error;
        }
      },

      markAsProcessed: async (id) => {
        try {
          await inboxDao.markAsProcessed(id);
          set((state) => ({
            inboxItems: state.inboxItems.map((item) =>
              item.id === id
                ? { ...item, processed: true, updatedAt: new Date() }
                : item
            ),
          }));
        } catch (error) {
          set({
            captureError:
              error instanceof Error ? error.message : '标记处理失败',
          });
          throw error;
        }
      },

      deleteInboxItem: async (id) => {
        try {
          await inboxDao.delete(id);
          set((state) => ({
            inboxItems: state.inboxItems.filter((item) => item.id !== id),
          }));
        } catch (error) {
          set({
            captureError:
              error instanceof Error ? error.message : '删除项目失败',
          });
          throw error;
        }
      },

      clearCaptureError: () => {
        set({ captureError: null });
      },

      // ===== 处理模块状态 =====
      currentItem: null,
      processingDecision: null,
      isProcessing: false,
      processError: null,

      // ===== 处理模块操作 =====
      setCurrentItem: (item) => {
        set({ currentItem: item });
      },

      setProcessingDecision: (decision) => {
        set({ processingDecision: decision });
      },

      processItem: async (itemId, decision) => {
        set({ isProcessing: true, processError: null });

        try {
          const { markAsProcessed, addAction, addWaitingItem } = get();

          // 根据决策类型处理项目
          switch (decision.actionType) {
            case ActionType.DO:
              // 创建立即执行的行动
              if (decision.context) {
                await addAction({
                  title: get().currentItem?.content || '',
                  contextId: decision.context,
                  priority: decision.priority || ('medium' as any),
                  status: ActionStatus.NEXT,
                  estimatedTime: decision.timeEstimate,
                });
              }
              break;

            case ActionType.DELEGATE:
              // 创建等待项目
              await addWaitingItem({
                title: get().currentItem?.content || '',
                waitingFor: '待指定',
                notes: decision.notes,
              });
              break;

            case ActionType.DEFER:
              // 创建延迟行动
              if (decision.context) {
                await addAction({
                  title: get().currentItem?.content || '',
                  contextId: decision.context,
                  priority: decision.priority || ('medium' as any),
                  status: ActionStatus.NEXT,
                  estimatedTime: decision.timeEstimate,
                });
              }
              break;

            case ActionType.DELETE:
              // 直接删除
              await get().deleteInboxItem(itemId);
              break;

            case ActionType.REFERENCE:
            case ActionType.SOMEDAY:
              // 标记为已处理但不创建行动
              break;
          }

          // 标记原项目为已处理
          if (decision.actionType !== ActionType.DELETE) {
            await markAsProcessed(itemId);
          }

          set({
            isProcessing: false,
            currentItem: null,
            processingDecision: null,
          });
        } catch (error) {
          set({
            isProcessing: false,
            processError:
              error instanceof Error ? error.message : '处理项目失败',
          });
          throw error;
        }
      },

      clearProcessError: () => {
        set({ processError: null });
      },

      // ===== 组织模块状态 =====
      actions: [],
      projects: [],
      contexts: [],
      waitingItems: [],
      calendarItems: [],
      selectedContext: null,
      selectedProject: null,
      filterCriteria: null,
      isLoading: false,
      organizeError: null,

      // ===== 组织模块操作 =====
      addAction: async (actionData) => {
        try {
          const id = await actionDao.create(actionData);
          const newAction: Action = {
            ...actionData,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            actions: [...state.actions, newAction],
          }));

          // 记录同步更改
          await syncService.recordLocalChange(
            'action',
            newAction.id,
            'create',
            newAction
          );

          // 更新搜索索引
          get().updateSearchIndex('actions');

          // 触发通知检查
          get().triggerNotificationCheck();
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '添加行动失败',
          });
          throw error;
        }
      },

      updateAction: async (id, updates) => {
        try {
          await actionDao.update(id, updates);
          const updatedAction = get().actions.find((a) => a.id === id);
          const newActionData = {
            ...updatedAction,
            ...updates,
            updatedAt: new Date(),
          } as Action;

          set((state) => ({
            actions: state.actions.map((action) =>
              action.id === id ? newActionData : action
            ),
          }));

          // 记录同步更改
          await syncService.recordLocalChange(
            'action',
            id,
            'update',
            newActionData
          );

          // 更新搜索索引
          get().updateSearchIndex('actions');

          // 触发通知检查
          get().triggerNotificationCheck();
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '更新行动失败',
          });
          throw error;
        }
      },

      deleteAction: async (id) => {
        try {
          await actionDao.delete(id);
          set((state) => ({
            actions: state.actions.filter((action) => action.id !== id),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '删除行动失败',
          });
          throw error;
        }
      },

      getActionsByContext: async (contextId) => {
        const actions = get().actions.filter(
          (action) => action.contextId === contextId
        );
        return actions;
      },

      getActionsByProject: async (projectId) => {
        const actions = get().actions.filter(
          (action) => action.projectId === projectId
        );
        return actions;
      },

      addProject: async (projectData) => {
        try {
          const id = await projectDao.create(projectData);
          const newProject: Project = {
            ...projectData,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            projects: [...state.projects, newProject],
          }));

          // 更新搜索索引
          get().updateSearchIndex('projects');
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '添加项目失败',
          });
          throw error;
        }
      },

      updateProject: async (id, updates) => {
        try {
          await projectDao.update(id, updates);
          set((state) => ({
            projects: state.projects.map((project) =>
              project.id === id
                ? { ...project, ...updates, updatedAt: new Date() }
                : project
            ),
          }));

          // 更新搜索索引
          get().updateSearchIndex('projects');
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '更新项目失败',
          });
          throw error;
        }
      },

      deleteProject: async (id) => {
        try {
          await projectDao.delete(id);
          set((state) => ({
            projects: state.projects.filter((project) => project.id !== id),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '删除项目失败',
          });
          throw error;
        }
      },

      addContext: async (contextData) => {
        try {
          const id = await contextDao.create(contextData);
          const newContext: Context = {
            ...contextData,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            contexts: [...state.contexts, newContext],
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '添加情境失败',
          });
          throw error;
        }
      },

      updateContext: async (id, updates) => {
        try {
          await contextDao.update(id, updates);
          set((state) => ({
            contexts: state.contexts.map((context) =>
              context.id === id
                ? { ...context, ...updates, updatedAt: new Date() }
                : context
            ),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '更新情境失败',
          });
          throw error;
        }
      },

      deleteContext: async (id) => {
        try {
          await contextDao.delete(id);
          set((state) => ({
            contexts: state.contexts.filter((context) => context.id !== id),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '删除情境失败',
          });
          throw error;
        }
      },

      addWaitingItem: async (itemData) => {
        try {
          const newItem: WaitingItem = {
            ...itemData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // TODO: 使用DAO保存到数据库
          set((state) => ({
            waitingItems: [...state.waitingItems, newItem],
          }));

          // 更新搜索索引
          get().updateSearchIndex('waiting');
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '添加等待项目失败',
          });
          throw error;
        }
      },

      updateWaitingItem: async (id, updates) => {
        try {
          // TODO: 使用DAO更新数据库
          set((state) => ({
            waitingItems: state.waitingItems.map((item) =>
              item.id === id
                ? { ...item, ...updates, updatedAt: new Date() }
                : item
            ),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '更新等待项目失败',
          });
          throw error;
        }
      },

      deleteWaitingItem: async (id) => {
        try {
          // TODO: 使用DAO从数据库删除
          set((state) => ({
            waitingItems: state.waitingItems.filter((item) => item.id !== id),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '删除等待项目失败',
          });
          throw error;
        }
      },

      addCalendarItem: async (itemData) => {
        try {
          const newItem: CalendarItem = {
            ...itemData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // TODO: 使用DAO保存到数据库
          set((state) => ({
            calendarItems: [...state.calendarItems, newItem],
          }));

          // 更新搜索索引
          get().updateSearchIndex('calendar');
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '添加日程项目失败',
          });
          throw error;
        }
      },

      updateCalendarItem: async (id, updates) => {
        try {
          // TODO: 使用DAO更新数据库
          set((state) => ({
            calendarItems: state.calendarItems.map((item) =>
              item.id === id
                ? { ...item, ...updates, updatedAt: new Date() }
                : item
            ),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '更新日程项目失败',
          });
          throw error;
        }
      },

      deleteCalendarItem: async (id) => {
        try {
          // TODO: 使用DAO从数据库删除
          set((state) => ({
            calendarItems: state.calendarItems.filter((item) => item.id !== id),
          }));
        } catch (error) {
          set({
            organizeError:
              error instanceof Error ? error.message : '删除日程项目失败',
          });
          throw error;
        }
      },

      setSelectedContext: (contextId) => {
        set({ selectedContext: contextId });
      },

      setSelectedProject: (projectId) => {
        set({ selectedProject: projectId });
      },

      setFilterCriteria: (criteria) => {
        set({ filterCriteria: criteria });
      },

      loadAllData: async () => {
        set({ isLoading: true });

        try {
          const { getInboxItems } = get();

          // 加载所有数据
          const [, contexts, projects, actions] = await Promise.all([
            getInboxItems(),
            contextDao.getAll(),
            projectDao.getAll(),
            actionDao.getAll(),
          ]);

          set({
            contexts,
            projects,
            actions,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            organizeError:
              error instanceof Error ? error.message : '加载数据失败',
          });
          throw error;
        }
      },

      clearOrganizeError: () => {
        set({ organizeError: null });
      },

      // ===== 执行模块状态 =====
      todayActions: [],
      nextActions: [],
      currentAction: null,
      completedToday: 0,
      isEngaging: false,
      engageError: null,

      // ===== 执行模块操作 =====
      getTodayActions: async () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const actions = get().actions.filter(
            (action) =>
              action.status === ActionStatus.NEXT &&
              (!action.dueDate || action.dueDate < tomorrow)
          );

          set({ todayActions: actions });
          return actions;
        } catch (error) {
          set({
            engageError:
              error instanceof Error ? error.message : '获取今日任务失败',
          });
          throw error;
        }
      },

      getNextActions: async (contextId) => {
        try {
          const actions = get().actions.filter(
            (action) =>
              action.status === ActionStatus.NEXT &&
              (!contextId || action.contextId === contextId)
          );

          set({ nextActions: actions });
          return actions;
        } catch (error) {
          set({
            engageError:
              error instanceof Error ? error.message : '获取下一步行动失败',
          });
          throw error;
        }
      },

      setCurrentAction: (action) => {
        set({ currentAction: action });
      },

      completeAction: async (id) => {
        try {
          const { updateAction } = get();
          await updateAction(id, {
            status: ActionStatus.COMPLETED,
            completedAt: new Date(),
          });

          set((state) => ({
            completedToday: state.completedToday + 1,
            currentAction:
              state.currentAction?.id === id ? null : state.currentAction,
          }));
        } catch (error) {
          set({
            engageError:
              error instanceof Error ? error.message : '完成任务失败',
          });
          throw error;
        }
      },

      updateActionProgress: async (id, progress) => {
        try {
          const { updateAction } = get();
          await updateAction(id, { progress });
        } catch (error) {
          set({
            engageError:
              error instanceof Error ? error.message : '更新进度失败',
          });
          throw error;
        }
      },

      refreshEngageData: async () => {
        try {
          const { getTodayActions, getNextActions } = get();
          await Promise.all([getTodayActions(), getNextActions()]);
        } catch (error) {
          set({
            engageError:
              error instanceof Error ? error.message : '刷新数据失败',
          });
          throw error;
        }
      },

      clearEngageError: () => {
        set({ engageError: null });
      },

      // ===== 回顾模块状态 =====
      reviewData: null,
      isReviewing: false,
      lastReviewDate: null,
      reviewError: null,

      // ===== 搜索模块状态 =====
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      searchError: null,

      // ===== 回顾模块操作 =====
      generateWeeklyReview: async () => {
        set({ isReviewing: true });

        try {
          const { actions, projects, waitingItems } = get();
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const completedActions = actions.filter(
            (a) =>
              a.status === ActionStatus.COMPLETED &&
              a.completedAt &&
              a.completedAt >= weekAgo
          ).length;

          const completedProjects = projects.filter(
            (p) =>
              p.status === ProjectStatus.COMPLETED &&
              p.completedAt &&
              p.completedAt >= weekAgo
          ).length;

          const pendingActions = actions.filter(
            (a) => a.status === ActionStatus.NEXT
          ).length;

          const pendingProjects = projects.filter(
            (p) => p.status === ProjectStatus.ACTIVE
          ).length;

          const reviewData: ReviewData = {
            date: now,
            completedActions,
            completedProjects,
            pendingActions,
            pendingProjects,
            waitingItems: waitingItems.length,
          };

          set({
            reviewData,
            isReviewing: false,
            lastReviewDate: now,
          });

          return reviewData;
        } catch (error) {
          set({
            isReviewing: false,
            reviewError:
              error instanceof Error ? error.message : '生成回顾数据失败',
          });
          throw error;
        }
      },

      updateProjectStatus: async (projectId, status) => {
        try {
          const { updateProject } = get();
          const updates: Partial<Project> = { status };

          if (status === ProjectStatus.COMPLETED) {
            updates.completedAt = new Date();
          }

          await updateProject(projectId, updates);
        } catch (error) {
          set({
            reviewError:
              error instanceof Error ? error.message : '更新项目状态失败',
          });
          throw error;
        }
      },

      cleanupCompletedItems: async (olderThan) => {
        try {
          const { actions, projects } = get();

          // 清理已完成的行动
          const actionsToKeep = actions.filter(
            (a) =>
              a.status !== ActionStatus.COMPLETED ||
              !a.completedAt ||
              a.completedAt > olderThan
          );

          // 清理已完成的项目
          const projectsToKeep = projects.filter(
            (p) =>
              p.status !== ProjectStatus.COMPLETED ||
              !p.completedAt ||
              p.completedAt > olderThan
          );

          set({
            actions: actionsToKeep,
            projects: projectsToKeep,
          });
        } catch (error) {
          set({
            reviewError:
              error instanceof Error ? error.message : '清理数据失败',
          });
          throw error;
        }
      },

      setLastReviewDate: (date) => {
        set({ lastReviewDate: date });
      },

      clearReviewError: () => {
        set({ reviewError: null });
      },

      // ===== 搜索模块操作 =====
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      performSearch: async (query, options) => {
        set({ isSearching: true, searchError: null });

        try {
          const { actions, projects, waitingItems, calendarItems, inboxItems } =
            get();

          // 确保搜索索引已初始化
          searchService.initializeIndexes({
            actions,
            projects,
            waitingItems,
            calendarItems,
            inboxItems,
          });

          const results = searchService.search(query, options);

          set({
            searchResults: results,
            searchQuery: query,
            isSearching: false,
          });

          return results;
        } catch (error) {
          set({
            isSearching: false,
            searchError: error instanceof Error ? error.message : '搜索失败',
          });
          throw error;
        }
      },

      clearSearch: () => {
        set({
          searchQuery: '',
          searchResults: [],
          searchError: null,
        });
      },

      initializeSearchIndexes: () => {
        const { actions, projects, waitingItems, calendarItems, inboxItems } =
          get();
        searchService.initializeIndexes({
          actions,
          projects,
          waitingItems,
          calendarItems,
          inboxItems,
        });
      },

      updateSearchIndex: (type) => {
        const state = get();
        switch (type) {
          case 'actions':
            searchService.updateIndex('actions', state.actions);
            break;
          case 'projects':
            searchService.updateIndex('projects', state.projects);
            break;
          case 'waiting':
            searchService.updateIndex('waiting', state.waitingItems);
            break;
          case 'calendar':
            searchService.updateIndex('calendar', state.calendarItems);
            break;
          case 'inbox':
            searchService.updateIndex('inbox', state.inboxItems);
            break;
        }
      },

      clearSearchError: () => {
        set({ searchError: null });
      },

      // ===== 全局应用状态 =====
      isInitialized: false,
      isOnline: true,
      lastSyncTime: null,
      globalError: null,

      // ===== 全局应用操作 =====
      initialize: async () => {
        try {
          const { loadAllData } = get();
          await loadAllData();

          // 初始化搜索索引
          get().initializeSearchIndexes();

          // 初始化通知系统
          const { actions, waitingItems, calendarItems } = get();
          notificationService.triggerCheck(
            actions,
            waitingItems,
            calendarItems
          );

          set({ isInitialized: true });
        } catch (error) {
          set({
            globalError: error instanceof Error ? error.message : '初始化失败',
          });
          throw error;
        }
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
      },

      setLastSyncTime: (time) => {
        set({ lastSyncTime: time });
      },

      setGlobalError: (error) => {
        set({ globalError: error });
      },

      // 触发通知检查
      triggerNotificationCheck: () => {
        const { actions, waitingItems, calendarItems } = get();
        notificationService.triggerCheck(actions, waitingItems, calendarItems);
      },

      reset: () => {
        set({
          // 收集模块
          inboxItems: [],
          isCapturing: false,
          captureError: null,

          // 处理模块
          currentItem: null,
          processingDecision: null,
          isProcessing: false,
          processError: null,

          // 组织模块
          actions: [],
          projects: [],
          contexts: [],
          waitingItems: [],
          calendarItems: [],
          selectedContext: null,
          selectedProject: null,
          filterCriteria: null,
          isLoading: false,
          organizeError: null,

          // 执行模块
          todayActions: [],
          nextActions: [],
          currentAction: null,
          completedToday: 0,
          isEngaging: false,
          engageError: null,

          // 回顾模块
          reviewData: null,
          isReviewing: false,
          lastReviewDate: null,
          reviewError: null,

          // 搜索模块
          searchQuery: '',
          searchResults: [],
          isSearching: false,
          searchError: null,

          // 全局状态
          isInitialized: false,
          isOnline: true,
          lastSyncTime: null,
          globalError: null,
        });
      },
    }),
    {
      name: 'gtd-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化需要的状态
        isInitialized: state.isInitialized,
        lastSyncTime: state.lastSyncTime,
        selectedContext: state.selectedContext,
        selectedProject: state.selectedProject,
        filterCriteria: state.filterCriteria,
      }),
    }
  )
);
