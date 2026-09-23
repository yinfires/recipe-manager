import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Item } from '../../types';
import { SearchInput } from '../common/SearchInput';

interface ItemEditDialogProps {
  item: Item | null;
  onSave: (item: Item) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function ItemEditDialog({ item, onSave, onDelete, onCancel, onClose }: ItemEditDialogProps) {
  const { data } = useApp();
  const [formData, setFormData] = useState<Item>({
    id: item?.id || '',
    name: item?.name || '',
    itemId: item?.itemId || '',
    tags: item?.tags || []
  });
  const [tagSearchText, setTagSearchText] = useState('');

  useEffect(() => {
    if (!item) {
      // 新建模式：生成唯一ID
      setFormData({
        id: `item_${Date.now()}`,
        name: '',
        itemId: '',
        tags: []
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.itemId.trim()) {
      alert('名称和物品ID不能为空');
      return;
    }

    onSave(formData);
  };

  const handleToggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  // 使用 useMemo 缓存过滤结果，只在搜索文本或标签数据变化时重新计算
  const filteredTags = useMemo(() => {
    const searchLower = tagSearchText.toLowerCase();
    return Object.values(data.tags).filter(tag =>
      tag.name.toLowerCase().includes(searchLower)
    );
  }, [data.tags, tagSearchText]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{item ? '编辑物品' : '新建物品'}</h2>
          <button type="button" className="dialog-close" onClick={onClose || onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-group">
            <label>显示名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：熟鳕鱼"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Minecraft ID *</label>
            <input
              type="text"
              value={formData.itemId}
              onChange={e => setFormData({ ...formData, itemId: e.target.value })}
              placeholder="例如：minecraft:cooked_cod"
            />
          </div>

          <div className="form-group">
            <label>所属标签 ({formData.tags.length} 个)</label>
            <SearchInput placeholder="搜索标签..." onSearch={setTagSearchText} />
            <div className="tag-selection">
              {filteredTags.map(tag => {
                const isChecked = formData.tags.includes(tag.id);
                return (
                  <label key={tag.id} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTag(tag.id)}
                    />
                    <span>🏷️ {tag.name}</span>
                  </label>
                );
              })}
              {filteredTags.length === 0 && tagSearchText && (
                <p className="hint-text">无匹配的标签</p>
              )}
              {Object.keys(data.tags).length === 0 && (
                <p className="hint-text">暂无标签，请先在标签管理中创建</p>
              )}
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
