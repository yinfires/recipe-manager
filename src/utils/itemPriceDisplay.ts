export interface ItemPriceDisplaySettings {
  showPrices: boolean;
  showProfit: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const ITEM_PRICE_DISPLAY_STORAGE_KEY = 'recipe_manager_item_price_display_v1';

export function loadItemPriceDisplaySettings(storage?: StorageLike): ItemPriceDisplaySettings {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    const saved = target?.getItem(ITEM_PRICE_DISPLAY_STORAGE_KEY);
    const value = saved ? JSON.parse(saved) : null;
    return { showPrices: value?.showPrices === true, showProfit: value?.showProfit === true };
  } catch {
    return { showPrices: false, showProfit: false };
  }
}

export function saveItemPriceDisplaySettings(settings: ItemPriceDisplaySettings, storage?: StorageLike): void {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    target?.setItem(ITEM_PRICE_DISPLAY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 浏览器禁用存储时，开关仍可在当前页面使用。
  }
}
