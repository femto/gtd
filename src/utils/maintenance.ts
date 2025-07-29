/**
 * 系统维护工具
 * 提供数据清理、导出导入、系统健康检查等功能
 */

import { actionDao } from '../database/dao/action-dao';
import { projectDao } from '../database/dao/project-dao';
import { contextDao } from '../database/dao/context-dao';
import { inboxDao } from '../database/dao/inbox-dao';
import type { Action, Project, Context, InboxItem } from '../types/interfaces';
import { ActionStatus, ProjectStatus } from '../types/enums';

/**
 * 系统健康检查结果接口
 */
export interface SystemHealthCheck {
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  issues: HealthIssue[];
  statistics: SystemStatistics;
  recommendations: string[];
}

/**
 * 健康问题接口
 */
export interface HealthIssue {
  type: 'warning' | 'error';
  category: 'data' | 'performance' | 'integrity';
  message: string;
  details?: string;
  count?: number;
}

/**
 * 系统统计信息接口
 */
export interface SystemStatistics {
  totalActions: number;
  totalProjects: number;
  totalContexts: number;
  totalInboxItems: number;
  completedActions: number;
  completedProjects: number;
  unprocessedInboxItems: number;
  overdueActions: number;
  projectsWithoutNextActions: number;
  orphanedActions: number;
  inactiveContexts: number;
  dataSize: number; // 估算的数据大小（字节）
}

/**
 * 数据导出格式接口
 */
export interface ExportData {
  version: string;
  exportDate: Date;
  actions: Action[];
  projects: Project[];
  contexts: Context[];
  inboxItems: InboxItem[];
  metadata: {
    totalRecords: number;
    exportedBy: string;
    systemVersion: string;
  };
}

/**
 * 清理选项接口
 */
export interface CleanupOptions {
  deleteCompletedActions?: boolean;
  deleteCompletedProjects?: boolean;
  deleteProcessedInboxItems?: boolean;
  deleteCancelledItems?: boolean;
  olderThanDays?: number;
  dryRun?: boolean; // 仅预览，不实际删除
}

/**
 * 清理结果接口
 */
export interface CleanupResult {
  deletedActions: number;
  deletedProjects: number;
  deletedInboxItems: number;
  freedSpace: number; // 估算释放的空间（字节）
  errors: string[];
}

/**
 * 系统维护工具类
 */
export class MaintenanceService {
  /**
   * 执行系统健康检查
   */
  static async performHealthCheck(): Promise<SystemHealthCheck> {
    const timestamp = new Date();
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];

    try {
      // 获取基础统计信息
      const statistics = await this.getSystemStatistics();

      // 检查未处理的工作篮项目
      if (statistics.unprocessedInboxItems > 0) {
        issues.push({
          type: 'warning',
          category: 'data',
          message: '工作篮中有未处理的项目',
          details: `${statistics.unprocessedInboxItems} 个项目需要处理`,
          count: statistics.unprocessedInboxItems,
        });
        recommendations.push('定期清空工作篮，处理所有收集的项目');
      }

      // 检查过期行动
      if (statistics.overdueActions > 0) {
        issues.push({
          type: 'warning',
          category: 'data',
          message: '存在过期的行动',
          details: `${statistics.overdueActions} 个行动已过期`,
          count: statistics.overdueActions,
        });
        recommendations.push('检查并更新过期行动的截止日期或完成状态');
      }

      // 检查没有下一步行动的项目
      if (statistics.projectsWithoutNextActions > 0) {
        issues.push({
          type: 'warning',
          category: 'data',
          message: '项目缺少下一步行动',
          details: `${statistics.projectsWithoutNextActions} 个活跃项目没有下一步行动`,
          count: statistics.projectsWithoutNextActions,
        });
        recommendations.push('为所有活跃项目定义明确的下一步行动');
      }

      // 检查孤立的行动
      if (statistics.orphanedActions > 0) {
        issues.push({
          type: 'error',
          category: 'integrity',
          message: '存在孤立的行动',
          details: `${statistics.orphanedActions} 个行动关联的情境或项目不存在`,
          count: statistics.orphanedActions,
        });
        recommendations.push('清理或重新分配孤立的行动');
      }

      // 检查未使用的情境
      if (statistics.inactiveContexts > 0) {
        issues.push({
          type: 'warning',
          category: 'data',
          message: '存在未使用的情境',
          details: `${statistics.inactiveContexts} 个情境没有关联的行动`,
          count: statistics.inactiveContexts,
        });
        recommendations.push('考虑删除或合并未使用的情境');
      }

      // 检查数据量
      if (statistics.dataSize > 10 * 1024 * 1024) {
        // 10MB
        issues.push({
          type: 'warning',
          category: 'performance',
          message: '数据量较大',
          details: `当前数据大小约为 ${Math.round(statistics.dataSize / 1024 / 1024)} MB`,
        });
        recommendations.push('考虑清理历史数据以提高性能');
      }

      // 确定整体健康状态
      const errorCount = issues.filter((i) => i.type === 'error').length;
      const warningCount = issues.filter((i) => i.type === 'warning').length;

      let status: 'healthy' | 'warning' | 'critical';
      if (errorCount > 0) {
        status = 'critical';
      } else if (warningCount > 3) {
        status = 'critical';
      } else if (warningCount > 0) {
        status = 'warning';
      } else {
        status = 'healthy';
        recommendations.push('系统运行良好，继续保持良好的GTD实践');
      }

      return {
        timestamp,
        status,
        issues,
        statistics,
        recommendations,
      };
    } catch (error) {
      return {
        timestamp,
        status: 'critical',
        issues: [
          {
            type: 'error',
            category: 'integrity',
            message: '健康检查失败',
            details: error instanceof Error ? error.message : '未知错误',
          },
        ],
        statistics: await this.getSystemStatistics().catch(() => ({
          totalActions: 0,
          totalProjects: 0,
          totalContexts: 0,
          totalInboxItems: 0,
          completedActions: 0,
          completedProjects: 0,
          unprocessedInboxItems: 0,
          overdueActions: 0,
          projectsWithoutNextActions: 0,
          orphanedActions: 0,
          inactiveContexts: 0,
          dataSize: 0,
        })),
        recommendations: ['请检查系统错误并联系技术支持'],
      };
    }
  }

  /**
   * 获取系统统计信息
   */
  static async getSystemStatistics(): Promise<SystemStatistics> {
    const [actions, projects, contexts, inboxItems] = await Promise.all([
      actionDao.getAll(),
      projectDao.getAll(),
      contextDao.getAll(),
      inboxDao.getAll(),
    ]);

    const now = new Date();
    const completedActions = actions.filter(
      (a) => a.status === ActionStatus.COMPLETED
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === ProjectStatus.COMPLETED
    ).length;
    const unprocessedInboxItems = inboxItems.filter((i) => !i.processed).length;

    const overdueActions = actions.filter(
      (a) => a.status === ActionStatus.NEXT && a.dueDate && a.dueDate < now
    ).length;

    // 检查没有下一步行动的活跃项目
    const activeProjects = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE
    );
    const projectsWithoutNextActions = activeProjects.filter((project) => {
      const projectActions = actions.filter(
        (a) => a.projectId === project.id && a.status === ActionStatus.NEXT
      );
      return projectActions.length === 0;
    }).length;

    // 检查孤立的行动（关联的情境或项目不存在）
    const contextIds = new Set(contexts.map((c) => c.id));
    const projectIds = new Set(projects.map((p) => p.id));
    const orphanedActions = actions.filter(
      (a) =>
        !contextIds.has(a.contextId) ||
        (a.projectId && !projectIds.has(a.projectId))
    ).length;

    // 检查未使用的情境
    const usedContextIds = new Set(actions.map((a) => a.contextId));
    const inactiveContexts = contexts.filter(
      (c) => c.isActive && !usedContextIds.has(c.id)
    ).length;

    // 估算数据大小
    const dataSize = this.estimateDataSize(
      actions,
      projects,
      contexts,
      inboxItems
    );

    return {
      totalActions: actions.length,
      totalProjects: projects.length,
      totalContexts: contexts.length,
      totalInboxItems: inboxItems.length,
      completedActions,
      completedProjects,
      unprocessedInboxItems,
      overdueActions,
      projectsWithoutNextActions,
      orphanedActions,
      inactiveContexts,
      dataSize,
    };
  }

  /**
   * 清理过期数据
   */
  static async cleanupData(
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    const {
      deleteCompletedActions = false,
      deleteCompletedProjects = false,
      deleteProcessedInboxItems = false,
      deleteCancelledItems = false,
      olderThanDays = 30,
      dryRun = false,
    } = options;

    const result: CleanupResult = {
      deletedActions: 0,
      deletedProjects: 0,
      deletedInboxItems: 0,
      freedSpace: 0,
      errors: [],
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // 清理已完成的行动
      if (deleteCompletedActions) {
        const completedActions = await actionDao.getCompletedActions();
        const actionsToDelete = completedActions.filter(
          (a) => a.completedAt && a.completedAt < cutoffDate
        );

        if (!dryRun) {
          for (const action of actionsToDelete) {
            await actionDao.delete(action.id);
          }
        }

        result.deletedActions = actionsToDelete.length;
        result.freedSpace += this.estimateDataSize(actionsToDelete, [], [], []);
      }

      // 清理已完成的项目
      if (deleteCompletedProjects) {
        const completedProjects = await projectDao.getCompletedProjects();
        const projectsToDelete = completedProjects.filter(
          (p) => p.completedAt && p.completedAt < cutoffDate
        );

        if (!dryRun) {
          for (const project of projectsToDelete) {
            await projectDao.delete(project.id);
          }
        }

        result.deletedProjects = projectsToDelete.length;
        result.freedSpace += this.estimateDataSize(
          [],
          projectsToDelete,
          [],
          []
        );
      }

      // 清理已处理的工作篮项目
      if (deleteProcessedInboxItems) {
        const processedItems = await inboxDao.getProcessedItems();
        const itemsToDelete = processedItems.filter(
          (i) => i.updatedAt < cutoffDate
        );

        if (!dryRun) {
          for (const item of itemsToDelete) {
            await inboxDao.delete(item.id);
          }
        }

        result.deletedInboxItems = itemsToDelete.length;
        result.freedSpace += this.estimateDataSize([], [], [], itemsToDelete);
      }

      // 清理已取消的项目和行动
      if (deleteCancelledItems) {
        const cancelledActions = await actionDao.getByStatus(
          ActionStatus.CANCELLED
        );
        const cancelledProjects = await projectDao.getCancelledProjects();

        const actionsToDelete = cancelledActions.filter(
          (a) => a.updatedAt < cutoffDate
        );
        const projectsToDelete = cancelledProjects.filter(
          (p) => p.updatedAt < cutoffDate
        );

        if (!dryRun) {
          for (const action of actionsToDelete) {
            await actionDao.delete(action.id);
          }
          for (const project of projectsToDelete) {
            await projectDao.delete(project.id);
          }
        }

        result.deletedActions += actionsToDelete.length;
        result.deletedProjects += projectsToDelete.length;
        result.freedSpace += this.estimateDataSize(
          actionsToDelete,
          projectsToDelete,
          [],
          []
        );
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : '清理过程中发生未知错误'
      );
    }

    return result;
  }

  /**
   * 导出数据
   */
  static async exportData(): Promise<ExportData> {
    const [actions, projects, contexts, inboxItems] = await Promise.all([
      actionDao.getAll(),
      projectDao.getAll(),
      contextDao.getAll(),
      inboxDao.getAll(),
    ]);

    return {
      version: '1.0.0',
      exportDate: new Date(),
      actions,
      projects,
      contexts,
      inboxItems,
      metadata: {
        totalRecords:
          actions.length +
          projects.length +
          contexts.length +
          inboxItems.length,
        exportedBy: 'GTD System',
        systemVersion: '1.0.0',
      },
    };
  }

  /**
   * 导入数据
   */
  static async importData(
    data: ExportData,
    options: {
      overwrite?: boolean;
    } = {}
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const { overwrite = false } = options;
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // 导入情境
      for (const context of data.contexts) {
        try {
          const existing = await contextDao.getById(context.id);
          if (existing) {
            if (overwrite) {
              await contextDao.update(context.id, context);
              result.imported++;
            } else {
              result.skipped++;
            }
          } else {
            await contextDao.create(context);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(
            `导入情境 ${context.name} 失败: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 导入项目
      for (const project of data.projects) {
        try {
          const existing = await projectDao.getById(project.id);
          if (existing) {
            if (overwrite) {
              await projectDao.update(project.id, project);
              result.imported++;
            } else {
              result.skipped++;
            }
          } else {
            await projectDao.create(project);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(
            `导入项目 ${project.title} 失败: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 导入行动
      for (const action of data.actions) {
        try {
          const existing = await actionDao.getById(action.id);
          if (existing) {
            if (overwrite) {
              await actionDao.update(action.id, action);
              result.imported++;
            } else {
              result.skipped++;
            }
          } else {
            await actionDao.create(action);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(
            `导入行动 ${action.title} 失败: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 导入工作篮项目
      for (const inboxItem of data.inboxItems) {
        try {
          const existing = await inboxDao.getById(inboxItem.id);
          if (existing) {
            if (overwrite) {
              await inboxDao.update(inboxItem.id, inboxItem);
              result.imported++;
            } else {
              result.skipped++;
            }
          } else {
            await inboxDao.create(inboxItem);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(
            `导入工作篮项目失败: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `导入过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * 估算数据大小
   */
  private static estimateDataSize(
    actions: Action[],
    projects: Project[],
    contexts: Context[],
    inboxItems: InboxItem[]
  ): number {
    // 简单估算：每个字符约1字节，加上对象结构开销
    const actionSize = actions.reduce((size, action) => {
      return size + JSON.stringify(action).length;
    }, 0);

    const projectSize = projects.reduce((size, project) => {
      return size + JSON.stringify(project).length;
    }, 0);

    const contextSize = contexts.reduce((size, context) => {
      return size + JSON.stringify(context).length;
    }, 0);

    const inboxSize = inboxItems.reduce((size, item) => {
      return size + JSON.stringify(item).length;
    }, 0);

    return actionSize + projectSize + contextSize + inboxSize;
  }

  /**
   * 生成数据备份文件名
   */
  static generateBackupFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `gtd-backup-${dateStr}-${timeStr}.json`;
  }

  /**
   * 下载数据备份
   */
  static async downloadBackup(): Promise<void> {
    const data = await this.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.generateBackupFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 导出单例实例
export const maintenanceService = MaintenanceService;
