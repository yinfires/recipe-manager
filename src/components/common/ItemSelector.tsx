import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';

interface ItemSelectorProps {
  value?: { type: 'item' | 'tag'; ref: string };
  onChange: (value: { type: 'item' | 'tag'; ref: string } | null) => void;
  placeholder?: string;
  allowTags?: boolean;
  excludeItemIds?: string[];
  allowedItemIds?: string[];
  keepOpenAfterSelect?: boolean;
}

export function ItemSelector({
  value,
  onChange,
  placeholder = '选择物品或标签',
  allowTags = true,
  excludeItemIds = [],
  allowedItemIds,
  keepOpenAfterSelect = false
}: ItemSelectorProps) {
  const { data, showItemIds } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = value?.type === 'item' ? data.items[value.ref] : null;
  const selectedTag = value?.type === 'tag' ? data.tags[value.ref] : null;

  const filteredItems = Object.values(data.items).filter(item =>
    !excludeItemIds.includes(item.id) &&
    (!allowedItemIds || allowedItemIds.includes(item.id)) &&
    (item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.itemId.toLowerCase().includes(searchText.toLowerCase()))
  );

  const filteredTags = allowTags ? Object.values(data.tags).filter(tag =>
    tag.name.toLowerCase().includes(searchText.toLowerCase())
  ) : [];

  return (
    <div className="item-selector" ref={containerRef}>
      <div className="selector-input" onClick={() => setIsOpen(!isOpen)}>
        {value ? (
          <div className="selected-value">
            <span className="icon">{value.type === 'item' ? '📦' : '🏷️'}</span>
            <span className="name">{selectedItem?.name || selectedTag?.name}</span>
            {showItemIds && selectedItem && (
              <span className="id">{selectedItem.itemId}</span>
            )}
          </div>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="selector-dropdown">
          <input
            type="text"
            className="selector-search"
            placeholder="搜索..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            autoFocus
          />
          <div className="selector-list">
            {value && (
              <div
                className="selector-item clear-item"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                <span className="icon">✖️</span>
                <span className="name">清除选择</span>
              </div>
            )}
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="selector-item"
                onClick={() => {
                  onChange({ type: 'item', ref: item.id });
                  if (!keepOpenAfterSelect) {
                    setIsOpen(false);
                  }
                  setSearchText('');
                }}
              >
                <span className="icon">📦</span>
                <span className="name">{item.name}</span>
                {showItemIds && <span className="id">{item.itemId}</span>}
              </div>
            ))}
            {allowTags && filteredTags.map(tag => (
              <div
                key={tag.id}
                className="selector-item"
                onClick={() => {
                  onChange({ type: 'tag', ref: tag.id });
                  if (!keepOpenAfterSelect) {
                    setIsOpen(false);
                  }
                  setSearchText('');
                }}
              >
                <span className="icon">🏷️</span>
                <span className="name">{tag.name}</span>
                <span className="count">({tag.items.length} 项)</span>
              </div>
            ))}
            {filteredItems.length === 0 && filteredTags.length === 0 && (
              <div className="empty-state">无匹配结果</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
