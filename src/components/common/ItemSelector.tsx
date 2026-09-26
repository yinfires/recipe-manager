import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { matchesSearch } from '../../utils/searchMatcher';

interface ItemSelectorProps {
  value?: { type: 'item' | 'tag'; ref: string };
  onChange: (value: { type: 'item' | 'tag'; ref: string } | null) => void;
  placeholder?: string;
  allowTags?: boolean;
  excludeItemIds?: string[];
  allowedItemIds?: string[];
  keepOpenAfterSelect?: boolean;
  compactAddTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dropdownOnly?: boolean;
}

export function ItemSelector({
  value,
  onChange,
  placeholder = '选择物品或标签',
  allowTags = true,
  excludeItemIds = [],
  allowedItemIds,
  keepOpenAfterSelect = false,
  compactAddTrigger = false,
  open,
  onOpenChange,
  dropdownOnly = false
}: ItemSelectorProps) {
  const { data, showItemIds } = useApp();
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOpen = open ?? internalOpen;

  const setIsOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as Element).closest('[data-item-selector-toggle]')) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, open, onOpenChange]);

  useLayoutEffect(() => {
    if (isOpen) searchInputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const selectedItem = value?.type === 'item' ? data.items[value.ref] : null;
  const selectedTag = value?.type === 'tag' ? data.tags[value.ref] : null;

  const filteredItems = Object.values(data.items).filter(item =>
    !excludeItemIds.includes(item.id) &&
    (!allowedItemIds || allowedItemIds.includes(item.id)) &&
    matchesSearch(searchText, item.name, item.itemId)
  );

  const filteredTags = allowTags ? Object.values(data.tags).filter(tag =>
    matchesSearch(searchText, tag.name)
  ) : [];

  const handleSelect = (selectedValue: { type: 'item' | 'tag'; ref: string }) => {
    onChange(selectedValue);
    if (!keepOpenAfterSelect) {
      setIsOpen(false);
      setSearchText('');
    }
  };

  return (
    <div
      className={`item-selector ${compactAddTrigger ? 'item-selector-compact-add' : ''} ${dropdownOnly ? 'item-selector-dropdown-only' : ''}`}
      ref={containerRef}
    >
      {!dropdownOnly && (
        <div
          className={`selector-input ${compactAddTrigger ? 'selector-input-compact-add' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {value ? (
            <div
              className="selected-value"
              data-entity-type={value.type}
              data-entity-id={value.ref}
            >
              <span className="icon">{value.type === 'item' ? '📦' : '🏷️'}</span>
              <span className="name">{selectedItem?.name || selectedTag?.name}</span>
              {showItemIds && selectedItem && (
                <span className="id">{selectedItem.itemId}</span>
              )}
            </div>
          ) : (
            <span className="placeholder">{compactAddTrigger ? `＋ ${placeholder}` : placeholder}</span>
          )}
          {!compactAddTrigger && <span className="arrow">{isOpen ? '▲' : '▼'}</span>}
        </div>
      )}

      {isOpen && (
        <div className="selector-dropdown">
          <input
            ref={searchInputRef}
            type="text"
            className="selector-search"
            placeholder="搜索..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
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
                data-entity-type="item"
                data-entity-id={item.id}
                onClick={() => handleSelect({ type: 'item', ref: item.id })}
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
                data-entity-type="tag"
                data-entity-id={tag.id}
                onClick={() => handleSelect({ type: 'tag', ref: tag.id })}
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
