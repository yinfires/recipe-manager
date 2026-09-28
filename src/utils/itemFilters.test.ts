import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ITEM_FILTER_SETTINGS,
  ITEM_FILTER_STORAGE_KEY,
  loadItemFilterSettings,
  normalizeItemFilterSettings,
  saveItemFilterSettings
} from './itemFilters';

describe('item filter settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes stored search and unique tag filters', () => {
    expect(normalizeItemFilterSettings({
      searchText: '小麦',
      selectedTagIds: ['food', 'food', 1, 'crop']
    })).toEqual({ searchText: '小麦', selectedTagIds: ['food', 'crop'] });
  });

  it('falls back when the stored settings are invalid', () => {
    expect(normalizeItemFilterSettings(null)).toEqual(DEFAULT_ITEM_FILTER_SETTINGS);
    expect(normalizeItemFilterSettings({ searchText: 3, selectedTagIds: 'food' }))
      .toEqual(DEFAULT_ITEM_FILTER_SETTINGS);
  });

  it('loads and saves settings through the versioned key', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value)
      }
    });

    saveItemFilterSettings({ searchText: '胡萝卜', selectedTagIds: ['crop'] });
    expect(storage.has(ITEM_FILTER_STORAGE_KEY)).toBe(true);
    expect(loadItemFilterSettings()).toEqual({ searchText: '胡萝卜', selectedTagIds: ['crop'] });
  });
});
