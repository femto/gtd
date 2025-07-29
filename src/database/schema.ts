/**
 * GTD数据库模式定义
 * 使用Dexie.js配置IndexedDB数据库结构
 */

import Dexie, { type Table } from 'dexie';
import type {
  InboxItem,
  Context,
  Action,
  Project,
  WaitingItem,
  CalendarItem,
  ReviewData,
} from '../types';

/**
 * GTD数据库类
 */
export class GTDDatabase extends Dexie {
  // 表定义
  inboxItems!: Table<InboxItem>;
  contexts!: Table<Context>;
  actions!: Table<Action>;
  projects!: Table<Project>;
  waitingItems!: Table<WaitingItem>;
  calendarItems!: Table<CalendarItem>;
  reviewData!: Table<ReviewData>;

  constructor() {
    super('GTDDatabase');

    // 版本1: 初始数据库结构
    this.version(1).stores({
      inboxItems: '++id, content, type, processed, createdAt, updatedAt',
      contexts: '++id, name, color, isActive, createdAt, updatedAt',
      actions:
        '++id, title, contextId, projectId, priority, status, dueDate, createdAt, updatedAt, completedAt',
      projects: '++id, title, status, createdAt, updatedAt, completedAt',
      waitingItems:
        '++id, title, waitingFor, followUpDate, actionId, projectId, createdAt, updatedAt',
      calendarItems:
        '++id, title, startTime, endTime, actionId, projectId, isAllDay, createdAt, updatedAt',
      reviewData: '++id, date, createdAt, updatedAt',
    });

    // 数据库钩子 - 自动设置时间戳
    this.inboxItems.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.inboxItems.hook(
      'updating',
      (modifications, _primKey, _obj, _trans) => {
        (modifications as any).updatedAt = new Date();
      }
    );

    this.contexts.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.contexts.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.actions.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.actions.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.projects.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.projects.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.waitingItems.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.waitingItems.hook(
      'updating',
      (modifications, _primKey, _obj, _trans) => {
        (modifications as any).updatedAt = new Date();
      }
    );

    this.calendarItems.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.calendarItems.hook(
      'updating',
      (modifications, _primKey, _obj, _trans) => {
        (modifications as any).updatedAt = new Date();
      }
    );

    this.reviewData.hook('creating', (_primKey, obj, _trans) => {
      (obj as any).createdAt = new Date();
      (obj as any).updatedAt = new Date();
    });

    this.reviewData.hook(
      'updating',
      (modifications, _primKey, _obj, _trans) => {
        (modifications as any).updatedAt = new Date();
      }
    );
  }
}

// 数据库实例
export const db = new GTDDatabase();
