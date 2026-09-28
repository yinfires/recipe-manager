import { useState } from 'react';
import { Item, Tag, Recipe } from '../../types';
import { useBackdropClick } from './useBackdropClick';

interface QuickMenuProps {
  target: Item | Tag | Recipe;
  type: 'item' | 'tag' | 'recipe';
  onClose: () => void;
  onBack?: () => void;
  onEdit?: () => void;
  onViewDetail?: () => void;
  onViewSource?: () => void;
  onViewUsage?: () => void;
  onViewTags?: () => void;
  onViewRecipeTree?: () => void;
  onAddSourceRecipe?: () => void;
}

export function QuickMenu({ target, type, onClose, onBack, onEdit, onViewDetail, onViewSource, onViewUsage, onViewTags, onViewRecipeTree, onAddSourceRecipe }: QuickMenuProps) {
  const [copiedField, setCopiedField] = useState<'name' | 'id' | null>(null);
  const backdropClickHandlers = useBackdropClick(onClose);

  const copyText = async (text: string, field: 'name' | 'id') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1200);
  };

  return (
    <div className="quick-menu-overlay" {...backdropClickHandlers}>
      <div
        className="quick-menu"
        onClick={e => e.stopPropagation()}
      >
        <div className="menu-header">
          <div
            className="menu-header-content"
            data-entity-type={type}
            data-entity-id={target.id}
          >
            <div className="menu-title-row">
              <span className="menu-title">
                {type === 'item' && '📦 ' + target.name}
                {type === 'tag' && '🏷️ ' + target.name}
                {type === 'recipe' && '📋 ' + target.name}
              </span>
              {type === 'item' && (
                <button
                  type="button"
                  className="copy-field-button"
                  onClick={() => copyText(target.name, 'name')}
                  title="复制物品名称"
                  aria-label="复制物品名称"
                >
                  {copiedField === 'name' ? '✓' : '⧉'}
                </button>
              )}
            </div>
            {type === 'item' && (
              <div className="menu-id-row">
                <span className="menu-id">{(target as Item).itemId}</span>
                <button
                  type="button"
                  className="copy-field-button"
                  onClick={() => copyText((target as Item).itemId, 'id')}
                  title="复制物品 ID"
                  aria-label="复制物品 ID"
                >
                  {copiedField === 'id' ? '✓' : '⧉'}
                </button>
              </div>
            )}
          </div>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        <div className="menu-actions">
          {onEdit && <button onClick={onEdit}>编辑</button>}
          {onViewDetail && <button onClick={onViewDetail}>显示详情</button>}
          {onViewSource && <button onClick={onViewSource}>查看获取配方 →</button>}
          {type === 'item' && onAddSourceRecipe && <button onClick={onAddSourceRecipe}>添加获取配方</button>}
          {onViewUsage && <button onClick={onViewUsage}>查看制作配方 →</button>}
          {type === 'item' && onViewTags && <button onClick={onViewTags}>显示详情</button>}
          {onViewRecipeTree && <button onClick={onViewRecipeTree}>查看配方树 →</button>}
          <hr />
          <button onClick={onBack || onClose}>返回</button>
        </div>
      </div>
    </div>
  );
}
