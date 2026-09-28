import { AppData, PersistedData } from '../types';

export const DATA_SCHEMA_VERSION = 2;
export const LEGACY_STORAGE_KEY = 'recipe_manager_data';
export const MIGRATION_MARKER_KEY = 'recipe_manager_file_migration_v2';
export type SaveState = 'loading' | 'saved' | 'saving' | 'error' | 'readonly';

export interface LoadedData {
  persisted: PersistedData;
  editable: boolean;
}

function emptyData(): AppData {
  return { items: {}, tags: {}, recipes: {} };
}

function normalizePersisted(value: unknown): PersistedData {
  const candidate = value as Partial<PersistedData> | null;
  const appData = candidate?.data as Partial<AppData> | undefined;
  return {
    schemaVersion: typeof candidate?.schemaVersion === 'number' ? candidate.schemaVersion : DATA_SCHEMA_VERSION,
    updatedAt: typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : new Date(0).toISOString(),
    data: {
      items: appData?.items || {},
      tags: appData?.tags || {},
      recipes: appData?.recipes || {}
    }
  };
}

async function readJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`数据请求失败：${response.status}`);
  return response.json();
}

export const DataStore = {
  async load(): Promise<LoadedData> {
    try {
      const status = await readJson('/api/data/status') as { editable?: boolean };
      if (status.editable) {
        return { persisted: normalizePersisted(await readJson('/api/data')), editable: true };
      }
    } catch {
      // 生产静态站没有开发 API，继续读取公开快照。
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
      return { items: value.items || {}, tags: value.tags || {}, recipes: value.recipes || {} };
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
