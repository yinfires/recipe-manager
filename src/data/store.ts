import { AppData, PersistedData } from '../types';
import { normalizeAppDataTimestamps } from './itemTimestamps';
import { normalizeUnlockPlan } from '../utils/unlockPlan';

export const DATA_SCHEMA_VERSION = 5;
export const LEGACY_STORAGE_KEY = 'recipe_manager_data';
export const MIGRATION_MARKER_KEY = 'recipe_manager_file_migration_v2';
export type SaveState = 'loading' | 'saved' | 'saving' | 'error' | 'readonly';

export interface LoadedData {
  persisted: PersistedData;
  editable: boolean;
}

function emptyData(): AppData {
  return { items: {}, tags: {}, recipes: {}, unlockPlan: normalizeUnlockPlan(undefined, new Set()) };
}

export function normalizePersisted(value: unknown): PersistedData {
  const candidate = value as Partial<PersistedData> | null;
  const appData = candidate?.data as Partial<AppData> | undefined;
  const updatedAt = typeof candidate?.updatedAt === 'string'
    ? candidate.updatedAt
    : new Date(0).toISOString();
  const data = normalizeAppDataTimestamps({
    items: appData?.items || {},
    tags: appData?.tags || {},
    recipes: appData?.recipes || {},
    unlockPlan: normalizeUnlockPlan(appData?.unlockPlan, new Set(Object.keys(appData?.items || {})))
  }, updatedAt);
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    updatedAt,
    data
  };
}

async function readJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`数据请求失败：${response.status}`);
  return response.json();
}

export const DataStore = {
  async load(): Promise<LoadedData> {
    if (import.meta.env.DEV) {
      try {
        const status = await readJson('/api/data/status') as { editable?: boolean };
        if (status.editable) {
          return { persisted: normalizePersisted(await readJson('/api/data')), editable: true };
        }
      } catch {
        // 开发服务器 API 不可用时回退到公开快照，并保持只读。
      }
    }

    try {
      const base = import.meta.env.BASE_URL || './';
      return {
        persisted: normalizePersisted(await readJson(`${base}data/recipe-manager.json`)),
        editable: false
      };
    } catch {
      return {
        persisted: { schemaVersion: DATA_SCHEMA_VERSION, updatedAt: new Date(0).toISOString(), data: emptyData() },
        editable: false
      };
    }
  },

  async save(data: AppData): Promise<PersistedData> {
    return normalizePersisted(await readJson('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaVersion: DATA_SCHEMA_VERSION, updatedAt: new Date().toISOString(), data })
    }));
  },

  getLegacyData(): AppData | null {
    try {
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!saved) return null;
      const value = JSON.parse(saved) as Partial<AppData>;
      return normalizeAppDataTimestamps(
        { items: value.items || {}, tags: value.tags || {}, recipes: value.recipes || {}, unlockPlan: normalizeUnlockPlan(value.unlockPlan, new Set(Object.keys(value.items || {}))) },
        new Date().toISOString()
      );
    } catch {
      return null;
    }
  },

  hasCompletedMigration(): boolean {
    return localStorage.getItem(MIGRATION_MARKER_KEY) === 'done';
  },

  markMigrationComplete(): void {
    localStorage.setItem(MIGRATION_MARKER_KEY, 'done');
  },

  download(data: AppData, filename = `recipe-manager-${new Date().toISOString().slice(0, 10)}.json`): void {
    const payload: PersistedData = { schemaVersion: DATA_SCHEMA_VERSION, updatedAt: new Date().toISOString(), data };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
};
