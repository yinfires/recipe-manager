import { AppData, Item } from '../types';

const ITEM_TIME_STEP_MS = 1000;

export function isValidItemCreatedAt(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function normalizeItemTimestamps(
  items: Record<string, Item>,
  anchorTime: string
): Record<string, Item> {
  const entries = Object.entries(items || {});
  const parsedAnchor = Date.parse(anchorTime);
  const anchorMs = Number.isFinite(parsedAnchor) ? parsedAnchor : Date.now();

  return Object.fromEntries(entries.map(([id, item], index) => {
    if (isValidItemCreatedAt(item.createdAt)) return [id, item];

    const offset = (entries.length - 1 - index) * ITEM_TIME_STEP_MS;
    return [id, { ...item, createdAt: new Date(anchorMs - offset).toISOString() }];
  }));
}

export function normalizeAppDataTimestamps(data: AppData, anchorTime: string): AppData {
  return {
    items: normalizeItemTimestamps(data.items || {}, anchorTime),
    tags: data.tags || {},
    recipes: data.recipes || {}
  };
}

export function getImportedItemCreatedAt(value: unknown, fallbackTime: string): string {
  return isValidItemCreatedAt(value) ? value : fallbackTime;
}
