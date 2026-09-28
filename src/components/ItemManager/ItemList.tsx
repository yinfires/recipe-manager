import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Item } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { TagFilter } from '../common/TagFilter';
import { ItemEditDialog } from './ItemEditDialog';
import { matchesSearch } from '../../utils/searchMatcher';

export function ItemList() {
  const { data, setData, isEditable } = useApp();
  const { setSelectedItem } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const items = Object.values(data.items).filter(item => {
    // 文本搜索过滤
    const matchesText = matchesSearch(searchText, item.name, item.itemId);

    // 标签过滤：物品必须包含所有选中的标签
    const matchesTags = selectedTagIds.length === 0 ||
      selectedTagIds.every(tagId => item.tags.includes(tagId));

    return matchesText && matchesTags;
  });

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSave = (item: Item) => {
    setData(prev => {
      // 批量构建更新
      const updatedTags: Record<string, any> = {};
      const newTags = item.tags || [];

      // 在新标签中添加此物品
      newTags.forEach((tagId: string) => {
        const tag = prev.tags[tagId];
        if (tag && !tag.items.includes(item.id)) {
          updatedTags[tagId] = {
            ...tag,
            items: [...tag.items, item.id]
          };
        }
      });

      return {
        ...prev,
        items: {
          ...prev.items,
          [item.id]: item
        },
        tags: Object.keys(updatedTags).length > 0
          ? { ...prev.tags, ...updatedTags }
          : prev.tags
      };
    });
    setIsCreating(false);
  };

  return (
    <div className="item-list-container">
      <div className="list-header">
        <SearchInput placeholder="搜索物品名称或ID..." onSearch={setSearchText} />
        <TagFilter
          selectedTags={selectedTagIds}
          onChange={setSelectedTagIds}
        />
        {isEditable && <button className="btn-primary" onClick={handleCreate}>+ 新建物品</button>}
      </div>

      <div className="item-grid">
        {items.map(item => (
          <div
            key={item.id}
            className="item-card"
            data-entity-type="item"
            data-entity-id={item.id}
            onClick={() => setSelectedItem(item)}
          >
            <ItemDisplay
              icon="📦"
              name={item.name}
              id={item.itemId}
              entityType="item"
              entityId={item.id}
            />
          </div>
        ))}
        {items.length === 0 && (
          <div className="empty-state">暂无物品</div>
        )}
      </div>

      {isEditable && isCreating && (
        <ItemEditDialog
          item={null}
          onSave={handleSave}
          onDelete={undefined}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}
