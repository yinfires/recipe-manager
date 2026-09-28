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
  const { setData, isEditable, isLoading } = useApp();

  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const rawItem = params.get('rmitem');
    if (!rawItem) return;
    if (!isEditable) {
      alert('公开快照为只读模式，无法导入物品');
      return;
    }

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
          const itemId = incoming.itemId.trim();
          const alreadyExists = Object.values(nextItems).some(
            existing => existing.itemId.trim() === itemId
          );

          // 导入不得覆盖已有物品；内部 ID 冲突时也保留现有数据。
          if (alreadyExists || nextItems[incoming.id]) return;

          nextItems[incoming.id] = {
            ...incoming,
            itemId
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
      alert('物品导入完成，已存在的同ID物品已保留');
    } catch {
      alert('物品导入链接解析失败');
    }
  }, [isEditable, isLoading, setData]);

  return null;
}
