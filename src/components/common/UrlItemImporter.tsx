import { useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Item } from '../../types';

function isImportItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<Item>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.itemId === 'string' &&
    Array.isArray(item.tags)
  );
}

function getImportItems(value: unknown): Item[] | null {
  if (isImportItem(value)) return [value];
  if (Array.isArray(value) && value.every(isImportItem)) return value;
  return null;
}

export function UrlItemImporter() {
  const { setData } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawItem = params.get('rmitem');
    if (!rawItem) return;

    try {
      const incomingItems = getImportItems(JSON.parse(rawItem));
      if (!incomingItems || incomingItems.length === 0) {
        alert('物品导入链接格式不正确');
        return;
      }

      setData(prev => {
        const items = prev.items || {};
        const nextItems = { ...items };

        incomingItems.forEach(incoming => {
          const existingId = Object.keys(nextItems).find(id => nextItems[id].itemId === incoming.itemId);
          const id = existingId || incoming.id;
          nextItems[id] = {
            ...nextItems[id],
            ...incoming,
            id
          };
        });

        return {
          ...prev,
          items: nextItems,
          tags: prev.tags || {},
          recipes: prev.recipes || {}
        };
      });

      params.delete('rmitem');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      alert(`已导入 ${incomingItems.length} 个物品`);
    } catch {
      alert('物品导入链接解析失败');
    }
  }, [setData]);

  return null;
}
