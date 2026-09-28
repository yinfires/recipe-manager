import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Item } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { TagFilter } from '../common/TagFilter';
import { ItemEditDialog } from './ItemEditDialog';
import { matchesSearch } from '../../utils/searchMatcher';
import { loadItemFilterSettings, saveItemFilterSettings } from '../../utils/itemFilters';
import {
  ItemSortDirection,
  ItemSortField,
  ItemSortSettings,
  changePrimarySortField,
  loadItemSortSettings,
  saveItemSortSettings,
  sortItems
} from '../../utils/itemSorting';

const SORT_FIELD_LABELS: Record<ItemSortField, string> = {
  createdAt: '时间',
  price: '价格',
  tags: '标签'
};

function DirectionButton({
  direction,
  label,
  onChange
}: {
  direction: ItemSortDirection;
  label: string;
  onChange: (direction: ItemSortDirection) => void;
}) {
  const nextDirection = direction === 'asc' ? 'desc' : 'asc';
  const directionText = direction === 'asc' ? '升序' : '降序';
  return (
    <button
      type="button"
      className="sort-direction-button"
      onClick={() => onChange(nextDirection)}
      title={`${label}：${directionText}，点击切换`}
      aria-label={`${label}当前为${directionText}，点击切换`}
    >
      {direction === 'asc' ? '↑' : '↓'}
    </button>
  );
}

function ItemSortToolbar({
  settings,
  onChange
}: {
  settings: ItemSortSettings;
  onChange: (settings: ItemSortSettings) => void;
}) {
  const availableSecondaryFields = (Object.keys(SORT_FIELD_LABELS) as ItemSortField[])
    .filter(field => field !== settings.primaryField);

  const changePrimaryField = (primaryField: ItemSortField) => {
    onChange(changePrimarySortField(settings, primaryField));
  };

  return (
    <div className="item-sort-toolbar" aria-label="物品排序工具栏">
      <div className="sort-control-group">
        <label htmlFor="item-primary-sort">主</label>
        <select
          id="item-primary-sort"
          value={settings.primaryField}
          onChange={event => changePrimaryField(event.target.value as ItemSortField)}
          aria-label="主要排序字段"
        >
          {(Object.keys(SORT_FIELD_LABELS) as ItemSortField[]).map(field => (
            <option key={field} value={field}>{SORT_FIELD_LABELS[field]}</option>
          ))}
        </select>
        <DirectionButton
          direction={settings.primaryDirection}
          label="主要排序"
          onChange={primaryDirection => onChange({ ...settings, primaryDirection })}
        />
      </div>

      <div className="sort-control-group">
        <label htmlFor="item-secondary-sort">次</label>
        <select
          id="item-secondary-sort"
          value={settings.secondaryField || ''}
          onChange={event => onChange({
            ...settings,
            secondaryField: event.target.value ? event.target.value as ItemSortField : null
          })}
          aria-label="次要排序字段"
        >
          <option value="">无</option>
          {availableSecondaryFields.map(field => (
            <option key={field} value={field}>{SORT_FIELD_LABELS[field]}</option>
          ))}
        </select>
        {settings.secondaryField && (
          <DirectionButton
            direction={settings.secondaryDirection}
            label="次要排序"
            onChange={secondaryDirection => onChange({ ...settings, secondaryDirection })}
          />
        )}
      </div>
    </div>
  );
}

export function ItemList() {
  const { data, setData, isEditable, isLoading } = useApp();
  const { setSelectedItem } = useNavigation();
  const initialFilters = useState(loadItemFilterSettings)[0];
  const [searchText, setSearchText] = useState(initialFilters.searchText);
  const [selectedTagIds, setSelectedTagIds] = useState(initialFilters.selectedTagIds);
  const [isCreating, setIsCreating] = useState(false);
  const [sortSettings, setSortSettings] = useState(loadItemSortSettings);

  useEffect(() => {
    saveItemSortSettings(sortSettings);
  }, [sortSettings]);

  useEffect(() => {
    saveItemFilterSettings({ searchText, selectedTagIds });
  }, [searchText, selectedTagIds]);

  useEffect(() => {
    if (isLoading) return;
    setSelectedTagIds(current => {
      const valid = current.filter(tagId => Boolean(data.tags[tagId]));
      return valid.length === current.length ? current : valid;
    });
  }, [data.tags, isLoading]);

  const filteredItems = Object.values(data.items).filter(item => {
    // 文本搜索过滤
    const matchesText = matchesSearch(searchText, item.name, item.itemId);

    // 标签过滤：物品必须包含所有选中的标签
    const matchesTags = selectedTagIds.length === 0 ||
      selectedTagIds.every(tagId => item.tags.includes(tagId));

    return matchesText && matchesTags;
  });
  const items = sortItems(filteredItems, data.tags, sortSettings);

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
        <SearchInput value={searchText} placeholder="搜索物品名称或ID..." onSearch={setSearchText} />
        <TagFilter
          selectedTags={selectedTagIds}
          onChange={setSelectedTagIds}
        />
        <ItemSortToolbar settings={sortSettings} onChange={setSortSettings} />
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
