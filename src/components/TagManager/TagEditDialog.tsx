import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Tag } from '../../types';
import { ItemSelector } from '../common/ItemSelector';
import { useBackdropClick } from '../common/useBackdropClick';

interface TagEditDialogProps {
  tag: Tag | null;
  onSave: (tag: Tag) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function TagEditDialog({ tag, onSave, onDelete, onCancel, onClose }: TagEditDialogProps) {
  const { data } = useApp();
  const backdropClickHandlers = useBackdropClick(onCancel);
  const [formData, setFormData] = useState<Tag>({
    id: tag?.id || '',
    name: tag?.name || '',
    items: tag?.items || [],
    childTags: tag?.childTags || [],
    parentTags: tag?.parentTags || []
  });

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
    setFormData({
      ...formData,
      items: [...formData.items, itemId]
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter(id => id !== itemId)
    });
  };

  const handleAddChildTag = (childTagId: string) => {
    if (formData.childTags.includes(childTagId) || childTagId === formData.id) return;
    setFormData({
      ...formData,
      childTags: [...formData.childTags, childTagId]
    });
  };

  const handleRemoveChildTag = (childTagId: string) => {
    setFormData({
      ...formData,
      childTags: formData.childTags.filter(id => id !== childTagId)
    });
  };

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div className="dialog dialog-large" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{tag ? '编辑标签' : '新建标签'}</h2>
          <button type="button" className="dialog-close" onClick={onClose || onCancel}>×</button>
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
                  <div
                    key={itemId}
                    className="tag-item-chip"
                    data-entity-type="item"
                    data-entity-id={item.id}
                  >
                    📦 {item.name}
                    <button type="button" onClick={() => handleRemoveItem(itemId)}>×</button>
                  </div>
                ) : null;
              })}
            </div>
            <ItemSelector
              value={undefined}
              onChange={(value) => {
                if (value?.type === 'item' && value.ref) {
                  handleAddItem(value.ref);
                }
              }}
              placeholder="搜索添加物品..."
              allowTags={false}
              excludeItemIds={formData.items}
              keepOpenAfterSelect={true}
            />
          </div>

          <div className="form-group">
            <label>子标签 ({formData.childTags.length})</label>
            <div className="tag-items-list">
              {formData.childTags.map(childTagId => {
                const childTag = data.tags[childTagId];
                return childTag ? (
                  <div
                    key={childTagId}
                    className="tag-item-chip"
                    data-entity-type="tag"
                    data-entity-id={childTag.id}
                  >
                    🏷️ {childTag.name}
                    <button type="button" onClick={() => handleRemoveChildTag(childTagId)}>×</button>
                  </div>
                ) : null;
              })}
            </div>
            <ItemSelector
              value={undefined}
              onChange={(value) => {
                if (value?.type === 'tag' && value.ref && value.ref !== formData.id) {
                  handleAddChildTag(value.ref);
                }
              }}
              placeholder="搜索添加子标签..."
              allowTags={true}
              keepOpenAfterSelect={true}
            />
          </div>

          <div className="dialog-footer">
            {onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                删除
              </button>
            )}
            <div className="dialog-footer-right">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                返回
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
