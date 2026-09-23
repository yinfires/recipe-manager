import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Tag } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { QuickMenu } from '../common/QuickMenu';
import { TagEditDialog } from './TagEditDialog';

export function TagList() {
  const { data, setData } = useApp();
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const tags = Object.values(data.tags).filter(tag =>
    tag.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSave = (tag: Tag) => {
    setData(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [tag.id]: tag
      }
    }));
    setEditingTag(null);
    setIsCreating(false);
  };

  const handleDelete = (tagId: string) => {
    if (!confirm('确定删除该标签吗？')) return;

    const newData = { ...data };
    const tag = newData.tags[tagId];

    // 从所有父标签的子标签列表中移除
    tag.parentTags.forEach(parentId => {
      if (newData.tags[parentId]) {
        newData.tags[parentId] = {
          ...newData.tags[parentId],
          childTags: newData.tags[parentId].childTags.filter(id => id !== tagId)
        };
      }
    });

    // 从所有子标签的父标签列表中移除
    tag.childTags.forEach(childId => {
      if (newData.tags[childId]) {
        newData.tags[childId] = {
          ...newData.tags[childId],
          parentTags: newData.tags[childId].parentTags.filter(id => id !== tagId)
        };
      }
    });

    delete newData.tags[tagId];
    setData(newData);
  };

  return (
    <div className="tag-list-container">
      <div className="list-header">
        <SearchInput placeholder="搜索标签名称..." onSearch={setSearchText} />
        <button className="btn-primary" onClick={handleCreate}>+ 新建标签</button>
      </div>

      <div className="tag-grid">
        {tags.map(tag => (
          <div key={tag.id} className="tag-card">
            <ItemDisplay
              icon="🏷️"
              name={tag.name}
              id={`${tag.items.length} 项物品`}
              onClick={() => setSelectedTag(tag)}
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

      {selectedTag && (
        <QuickMenu
          target={selectedTag}
          type="tag"
          onClose={() => setSelectedTag(null)}
          onEdit={() => {
            setEditingTag(selectedTag);
            setSelectedTag(null);
          }}
          onViewSource={() => {
            // TODO: 查看标签相关配方
            setSelectedTag(null);
          }}
          onViewUsage={() => {
            // TODO: 查看标签相关配方
            setSelectedTag(null);
          }}
        />
      )}

      {(editingTag || isCreating) && (
        <TagEditDialog
          tag={editingTag}
          onSave={handleSave}
          onDelete={editingTag ? () => handleDelete(editingTag.id) : undefined}
          onCancel={() => {
            setEditingTag(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
