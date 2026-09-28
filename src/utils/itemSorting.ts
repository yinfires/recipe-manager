import { Item, Tag } from '../types';
import { getEffectivePrice } from './priceCalculator';

export type ItemSortField = 'createdAt' | 'price' | 'tags';
export type ItemSortDirection = 'asc' | 'desc';

export interface ItemSortSettings {
  primaryField: ItemSortField;
  primaryDirection: ItemSortDirection;
  secondaryField: ItemSortField | null;
  secondaryDirection: ItemSortDirection;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const ITEM_SORT_STORAGE_KEY = 'recipe_manager_item_sort_v1';
export const DEFAULT_ITEM_SORT_SETTINGS: ItemSortSettings = {
  primaryField: 'createdAt',
  primaryDirection: 'desc',
  secondaryField: null,
  secondaryDirection: 'asc'
};

const fields: ItemSortField[] = ['createdAt', 'price', 'tags'];
const directions: ItemSortDirection[] = ['asc', 'desc'];
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

function isSortField(value: unknown): value is ItemSortField {
  return fields.includes(value as ItemSortField);
}

function isSortDirection(value: unknown): value is ItemSortDirection {
  return directions.includes(value as ItemSortDirection);
}

export function normalizeItemSortSettings(value: unknown): ItemSortSettings {
  if (!value || typeof value !== 'object') return DEFAULT_ITEM_SORT_SETTINGS;
  const candidate = value as Partial<ItemSortSettings>;
  const primaryField = isSortField(candidate.primaryField)
    ? candidate.primaryField
    : DEFAULT_ITEM_SORT_SETTINGS.primaryField;
  const secondaryField = isSortField(candidate.secondaryField) && candidate.secondaryField !== primaryField
    ? candidate.secondaryField
    : null;

  return {
    primaryField,
    primaryDirection: isSortDirection(candidate.primaryDirection)
      ? candidate.primaryDirection
      : DEFAULT_ITEM_SORT_SETTINGS.primaryDirection,
    secondaryField,
    secondaryDirection: isSortDirection(candidate.secondaryDirection)
      ? candidate.secondaryDirection
      : DEFAULT_ITEM_SORT_SETTINGS.secondaryDirection
  };
}

export function changePrimarySortField(
  settings: ItemSortSettings,
  primaryField: ItemSortField
): ItemSortSettings {
  return normalizeItemSortSettings({
    ...settings,
    primaryField,
    secondaryField: settings.secondaryField === primaryField ? null : settings.secondaryField
  });
}

export function loadItemSortSettings(storage?: StorageLike): ItemSortSettings {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return DEFAULT_ITEM_SORT_SETTINGS;
    const saved = target.getItem(ITEM_SORT_STORAGE_KEY);
    return saved ? normalizeItemSortSettings(JSON.parse(saved)) : DEFAULT_ITEM_SORT_SETTINGS;
  } catch {
    return DEFAULT_ITEM_SORT_SETTINGS;
  }
}

export function saveItemSortSettings(settings: ItemSortSettings, storage?: StorageLike): void {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return;
    target.setItem(ITEM_SORT_STORAGE_KEY, JSON.stringify(normalizeItemSortSettings(settings)));
  } catch {
    // 浏览器禁用存储时仍允许使用当前页面的排序。
  }
}

function tagSortKey(item: Item, tags: Record<string, Tag>): string | undefined {
  const names = item.tags
    .map(tagId => tags[tagId]?.name.trim())
    .filter((name): name is string => Boolean(name))
    .sort(collator.compare);
  return names.length > 0 ? names.join('\x1F') : undefined;
}

function comparePresentValues(left: number | string, right: number | string): number {
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : collator.compare(String(left), String(right));
}

function fieldValue(item: Item, field: ItemSortField, tags: Record<string, Tag>): number | string | undefined {
  if (field === 'price') return getEffectivePrice(item);
  if (field === 'tags') return tagSortKey(item, tags);

  const time = typeof item.createdAt === 'string' ? Date.parse(item.createdAt) : Number.NaN;
  return Number.isFinite(time) ? time : undefined;
}

function compareField(
  left: Item,
  right: Item,
  field: ItemSortField,
  direction: ItemSortDirection,
  tags: Record<string, Tag>
): number {
  const leftValue = fieldValue(left, field, tags);
  const rightValue = fieldValue(right, field, tags);
  const leftMissing = leftValue === undefined;
  const rightMissing = rightValue === undefined;

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }

  const result = comparePresentValues(leftValue, rightValue);
  return direction === 'asc' ? result : -result;
}

export function sortItems(
  items: Item[],
  tags: Record<string, Tag>,
  settings: ItemSortSettings
): Item[] {
  const normalized = normalizeItemSortSettings(settings);
  return [...items].sort((left, right) => {
    const primary = compareField(
      left, right, normalized.primaryField, normalized.primaryDirection, tags
    );
    if (primary !== 0) return primary;

    if (normalized.secondaryField) {
      const secondary = compareField(
        left, right, normalized.secondaryField, normalized.secondaryDirection, tags
      );
      if (secondary !== 0) return secondary;
    }

    return collator.compare(left.name, right.name)
      || collator.compare(left.itemId, right.itemId)
      || collator.compare(left.id, right.id);
  });
}
