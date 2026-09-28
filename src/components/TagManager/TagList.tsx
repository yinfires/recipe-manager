import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Tag } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { TagEditDialog } from './TagEditDialog';
import { matchesSearch } from '../../utils/searchMatcher';

export function TagList() {
  const { data, setData, isEditable } = useApp();
  const { setSelectedTag } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const tags = Object.values(data.tags).filter(tag =>
    matchesSearch(searchText, tag.name)
  );

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSave = (tag: Tag) => {
    setData(prev => {
      // 批量构建更新
      const updatedTags: Record<string, any> = {
        [tag.id]: tag
      };
      const updatedItems: Record<string, any> = {};

      // 同步所有子标签的父标签引用
      tag.childTags.forEach(childId => {
        const childTag = prev.tags[childId];
        if (childTag && !childTag.parentTags.includes(tag.id)) {
          updatedTags[childId] = {
            ...childTag,
            parentTags: [...childTag.parentTags, tag.id]
          };
        }
      });

      // 从物品反向同步：更新物品的 tags 字段
      tag.items.forEach(itemId => {
        const item = prev.items[itemId];
        const itemTags = item?.tags || [];
        if (item && !itemTags.includes(tag.id)) {
          updatedItems[itemId] = {
            ...item,
            tags: [...itemTags, tag.id]
          };
        }
      });

      return {
        ...prev,
        tags: {
          ...prev.tags,
          ...updatedTags
        },
        items: Object.keys(updatedItems).length > 0
          ? { ...prev.items, ...updatedItems }
          : prev.items
      };
    });
    setIsCreating(false);
  };

  return (
    <div className="tag-list-container">
      <div className="list-header">
        <SearchInput placeholder="搜索标签名称..." onSearch={setSearchText} />
        {isEditable && <button className="btn-primary" onClick={handleCreate}>+ 新建标签</button>}
      </div>

      <div className="tag-grid">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="tag-card"
            data-entity-type="tag"
            data-entity-id={tag.id}
            onClick={() => setSelectedTag(tag)}
          >
            <ItemDisplay
              icon="🏷️"
              name={tag.name}
              id={`${tag.items.length} 项物品`}
              entityType="tag"
              entityId={tag.id}
            />
            {tag.childTags.length > 0 && (
              <div className="tag-children">
                包含 {tag.childTags.length} 个子标签
              </div>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <div className="empty-state">暂无标签</div>
        )}
      </div>

      {isEditable && isCreating && (
        <TagEditDialog
          tag={null}
          onSave={handleSave}
          onDelete={undefined}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}
