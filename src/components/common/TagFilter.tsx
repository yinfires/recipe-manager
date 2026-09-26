import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { matchesSearch } from '../../utils/searchMatcher';

interface TagFilterProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagFilter({ selectedTags, onChange }: TagFilterProps) {
  const { data } = useApp();
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

  const filteredTags = Object.values(data.tags).filter(tag =>
    matchesSearch(searchText, tag.name)
  );

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setIsOpen(false);
  };

  const selectedTagNames = selectedTags
    .map(id => data.tags[id]?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="tag-filter" ref={containerRef}>
      <div className="tag-filter-input" onClick={() => setIsOpen(!isOpen)}>
        {selectedTags.length > 0 ? (
          <div
            className="selected-tags"
            data-entity-type={selectedTags.length === 1 ? 'tag' : undefined}
            data-entity-id={selectedTags.length === 1 ? selectedTags[0] : undefined}
          >
            <span className="icon">🏷️</span>
            <span className="tags-text">
              {selectedTags.length === 1 ? selectedTagNames : `${selectedTags.length} 个标签`}
            </span>
          </div>
        ) : (
          <span className="placeholder">按标签筛选</span>
        )}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="tag-filter-dropdown">
          <input
            type="text"
            className="tag-filter-search"
            placeholder="搜索标签..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            autoFocus
          />
          <div className="tag-filter-list">
            {selectedTags.length > 0 && (
              <div className="tag-filter-item clear-item" onClick={clearAll}>
                <span className="icon">✖️</span>
                <span className="name">清除所有</span>
              </div>
            )}
            {filteredTags.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className={`tag-filter-item ${isSelected ? 'selected' : ''}`}
                  data-entity-type="tag"
                  data-entity-id={tag.id}
                  onClick={() => toggleTag(tag.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="tag-checkbox"
                  />
                  <span className="icon">🏷️</span>
                  <span className="name">{tag.name}</span>
                  <span className="count">({tag.items.length} 项)</span>
                </div>
              );
            })}
            {filteredTags.length === 0 && (
              <div className="empty-state">无匹配标签</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
