import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Tag } from '../../types';
import { TagResolver } from '../../data/tagResolver';

interface TagEditDialogProps {
  tag: Tag | null;
  onSave: (tag: Tag) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function TagEditDialog({ tag, onSave, onDelete, onCancel }: TagEditDialogProps) {
  const { data, setData } = useApp();
  const [formData, setFormData] = useState<Tag>({
    id: tag?.id || '',
    name: tag?.name || '',
    items: tag?.items || [],
    childTags: tag?.childTags || [],
    parentTags: tag?.parentTags || []
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!tag) {
      // 新建模式：生成唯一ID
      setFormData({
        id: `tag_${Date.now()}`,
        name: '',
        items: [],
        childTags: [],
        parentTags: []
      });
    }
  }, [tag]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('标签名称不能为空');
      return;
    }

    onSave(formData);
  };

  const handleAddItem = (itemId: string) => {
    if (formData.items.includes(itemId)) return;

    // 使用 TagResolver 同步到父标签
    const newData = TagResolver.addItemToTag(data, formData.id, itemId);
    setData(newData);
    setFormData(newData.tags[formData.id]);
  };

  const handleRemoveItem = (itemId: string) => {
    // 使用 TagResolver 从父标签同步移除
    const newData = TagResolver.removeItemFromTag(data, formData.id, itemId);
    setData(newData);
    setFormData(newData.tags[formData.id]);
  };

  const handleAddChildTag = (childTagId: string) => {
    if (formData.childTags.includes(childTagId) || childTagId === formData.id) return;

    // 使用 TagResolver 建立父子关系并同步物品
    const newData = TagResolver.addChildTag(data, formData.id, childTagId);
    setData(newData);
    setFormData(newData.tags[formData.id]);
  };

  const handleRemoveChildTag = (childTagId: string) => {
    // 使用 TagResolver 移除父子关系
    const newData = TagResolver.removeChildTag(data, formData.id, childTagId);
    setData(newData);
    setFormData(newData.tags[formData.id]);
  };

  const availableItems = Object.values(data.items).filter(item =>
    !formData.items.includes(item.id) &&
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const availableTags = Object.values(data.tags).filter(t =>
    t.id !== formData.id &&
    !formData.childTags.includes(t.id) &&
    t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog dialog-large" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{tag ? '编辑标签' : '新建标签'}</h2>
          <button className="dialog-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-group">
            <label>标签名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：鱼类"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>包含的物品 ({formData.items.length})</label>
            <div className="tag-items-list">
              {formData.items.map(itemId => {
                const item = data.items[itemId];
                return item ? (
                  <div key={itemId} className="tag-item-chip">
                    📦 {item.name}
                    <button type="button" onClick={() => handleRemoveItem(itemId)}>×</button>
                  </div>
                ) : null;
              })}
            </div>
            <input
              type="text"
              placeholder="搜索添加物品..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <div className="tag-items-available">
              {availableItems.slice(0, 10).map(item => (
                <div key={item.id} className="tag-item-available" onClick={() => handleAddItem(item.id)}>
                  📦 {item.name}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>子标签 ({formData.childTags.length})</label>
            <div className="tag-items-list">
              {formData.childTags.map(childTagId => {
                const childTag = data.tags[childTagId];
                return childTag ? (
                  <div key={childTagId} className="tag-item-chip">
                    🏷️ {childTag.name}
                    <button type="button" onClick={() => handleRemoveChildTag(childTagId)}>×</button>
                  </div>
                ) : null;
              })}
            </div>
            <div className="tag-items-available">
              {availableTags.slice(0, 10).map(t => (
                <div key={t.id} className="tag-item-available" onClick={() => handleAddChildTag(t.id)}>
                  🏷️ {t.name}
                </div>
              ))}
            </div>
          </div>

          <div className="dialog-footer">
            {onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                删除
              </button>
            )}
            <div className="dialog-footer-right">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                取消
              </button>
              <button type="submit" className="btn-primary">
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
