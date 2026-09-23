import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Tag } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';

interface TagDetailDialogProps {
  tag: Tag;
  onClose: () => void;
  onBack?: () => void;
  onNavigateToItem: (itemId: string) => void;
  onNavigateToTag: (tagId: string) => void;
}

export function TagDetailDialog({ tag, onClose, onBack, onNavigateToItem, onNavigateToTag }: TagDetailDialogProps) {
  const { data, showItemIds } = useApp();
  const [searchText, setSearchText] = useState('');

  const filteredItems = tag.items
    .map(itemId => data.items[itemId])
    .filter(item => item && (
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.itemId.toLowerCase().includes(searchText.toLowerCase())
    ));

  const childTags = Object.values(data.tags).filter(t => t.parentTags?.includes(tag.id));

  return (
    <div className="dialog-overlay" onClick={onBack || onClose}>
      <div className="dialog dialog-large" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>🏷️ {tag.name} - 标签详情</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="detail-content">
            <div className="detail-section">
              <div className="section-title">搜索物品</div>
              <SearchInput placeholder="搜索物品名称或ID..." onSearch={setSearchText} />
            </div>

            <div className="detail-section">
              <div className="section-title">包含的物品 ({filteredItems.length})</div>
              {filteredItems.length > 0 ? (
                <div className="item-grid-detail">
                  {filteredItems.map(item => (
                    <div key={item.id} className="item-card-detail">
                      <ItemDisplay
                        icon="📦"
                        name={item.name}
                        id={showItemIds ? item.itemId : ''}
                        onClick={() => onNavigateToItem(item.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  {searchText ? '无匹配的物品' : '该标签不包含任何物品'}
                </div>
              )}
            </div>

            {childTags.length > 0 && (
              <div className="detail-section">
                <div className="section-title">子标签 ({childTags.length})</div>
                <div className="item-grid-detail">
                  {childTags.map(childTag => (
                    <div key={childTag.id} className="item-card-detail">
                      <ItemDisplay
                        icon="🏷️"
                        name={childTag.name}
                        id=""
                        onClick={() => onNavigateToTag(childTag.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {onBack && (
          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onBack}>
              返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
