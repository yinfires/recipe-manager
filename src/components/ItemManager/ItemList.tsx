import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Item } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { QuickMenu } from '../common/QuickMenu';
import { ItemEditDialog } from './ItemEditDialog';

export function ItemList() {
  const { data, setData } = useApp();
  const [searchText, setSearchText] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const items = Object.values(data.items).filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.itemId.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSave = (item: Item) => {
    setData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [item.id]: item
      }
    }));
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleDelete = (itemId: string) => {
    if (!confirm('确定删除该物品吗？')) return;

    const newData = { ...data };
    delete newData.items[itemId];

    // 从所有标签中移除该物品
    Object.keys(newData.tags).forEach(tagId => {
      newData.tags[tagId] = {
        ...newData.tags[tagId],
        items: newData.tags[tagId].items.filter(id => id !== itemId)
      };
    });

    setData(newData);
  };

  return (
    <div className="item-list-container">
      <div className="list-header">
        <SearchInput placeholder="搜索物品名称或ID..." onSearch={setSearchText} />
        <button className="btn-primary" onClick={handleCreate}>+ 新建物品</button>
      </div>

      <div className="item-grid">
        {items.map(item => (
          <div key={item.id} className="item-card">
            <ItemDisplay
              icon="📦"
              name={item.name}
              id={item.itemId}
              onClick={() => setSelectedItem(item)}
            />
          </div>
        ))}
        {items.length === 0 && (
          <div className="empty-state">暂无物品</div>
        )}
      </div>

      {selectedItem && (
        <QuickMenu
          target={selectedItem}
          type="item"
          onClose={() => setSelectedItem(null)}
          onEdit={() => {
            setEditingItem(selectedItem);
            setSelectedItem(null);
          }}
          onViewSource={() => {
            // TODO: 跳转到配方树
            setSelectedItem(null);
          }}
          onViewUsage={() => {
            // TODO: 跳转到配方树
            setSelectedItem(null);
          }}
          onViewTags={() => {
            // TODO: 显示所在标签
            setSelectedItem(null);
          }}
        />
      )}

      {(editingItem || isCreating) && (
        <ItemEditDialog
          item={editingItem}
          onSave={handleSave}
          onDelete={editingItem ? () => handleDelete(editingItem.id) : undefined}
          onCancel={() => {
            setEditingItem(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
