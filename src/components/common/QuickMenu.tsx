import { Item, Tag } from '../../types';

interface QuickMenuProps {
  target: Item | Tag;
  type: 'item' | 'tag';
  onClose: () => void;
  onEdit: () => void;
  onViewSource: () => void;
  onViewUsage: () => void;
  onViewTags?: () => void;
}

export function QuickMenu({ target, type, onClose, onEdit, onViewSource, onViewUsage, onViewTags }: QuickMenuProps) {
  return (
    <div className="quick-menu-overlay" onClick={onClose}>
      <div className="quick-menu" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          {type === 'item' ? '📦' : '🏷️'} {target.name}
          {type === 'item' && <div className="menu-id">{(target as Item).itemId}</div>}
        </div>
        <div className="menu-actions">
          <button onClick={onEdit}>编辑详情</button>
          <button onClick={onViewSource}>查看获取配方 →</button>
          <button onClick={onViewUsage}>查看制作配方 →</button>
          {type === 'item' && onViewTags && <button onClick={onViewTags}>查看所在标签</button>}
          <hr />
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
