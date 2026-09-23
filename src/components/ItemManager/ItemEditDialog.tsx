import { useState, useEffect } from 'react';
import { Item } from '../../types';

interface ItemEditDialogProps {
  item: Item | null;
  onSave: (item: Item) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function ItemEditDialog({ item, onSave, onDelete, onCancel }: ItemEditDialogProps) {
  const [formData, setFormData] = useState<Item>({
    id: item?.id || '',
    name: item?.name || '',
    itemId: item?.itemId || '',
    tags: item?.tags || []
  });

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

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{item ? '编辑物品' : '新建物品'}</h2>
          <button className="dialog-close" onClick={onCancel}>×</button>
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
