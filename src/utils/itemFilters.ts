export interface ItemFilterSettings {
  searchText: string;
  selectedTagIds: string[];
}

export const DEFAULT_ITEM_FILTER_SETTINGS: ItemFilterSettings = {
  searchText: '',
  selectedTagIds: []
};

export const ITEM_FILTER_STORAGE_KEY = 'recipe_manager_item_filter_v1';

export function normalizeItemFilterSettings(value: unknown): ItemFilterSettings {
  if (!value || typeof value !== 'object') return DEFAULT_ITEM_FILTER_SETTINGS;
  const candidate = value as Partial<ItemFilterSettings>;
  const selectedTagIds = Array.isArray(candidate.selectedTagIds)
    ? [...new Set(candidate.selectedTagIds.filter((id): id is string => typeof id === 'string'))]
    : [];

  return {
    searchText: typeof candidate.searchText === 'string' ? candidate.searchText : '',
    selectedTagIds
  };
}

export function loadItemFilterSettings(): ItemFilterSettings {
  try {
    const stored = window.localStorage.getItem(ITEM_FILTER_STORAGE_KEY);
    return stored ? normalizeItemFilterSettings(JSON.parse(stored)) : DEFAULT_ITEM_FILTER_SETTINGS;
  } catch {
    return DEFAULT_ITEM_FILTER_SETTINGS;
  }
}

export function saveItemFilterSettings(settings: ItemFilterSettings) {
  try {
    window.localStorage.setItem(ITEM_FILTER_STORAGE_KEY, JSON.stringify(normalizeItemFilterSettings(settings)));
  } catch {
    // 浏览器禁用存储时仍保持当前页面内的筛选状态。
  }
}
