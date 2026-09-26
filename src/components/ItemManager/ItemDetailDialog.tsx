import { useApp } from '../../contexts/AppContext';
import { Item, Recipe, Tag } from '../../types';
import { ItemDisplay } from '../common/ItemDisplay';
import { findRecipesForTarget } from '../../utils/recipeRelations';
import { entityDataAttributes } from '../../utils/entityTarget';
import { useBackdropClick } from '../common/useBackdropClick';

interface ItemDetailDialogProps {
  item: Item | Tag;
  mode: 'source' | 'usage' | 'tags';
  onClose: () => void;
  onBack?: () => void;
  onNavigateToItem?: (itemId: string) => void;
  onNavigateToTag?: (tagId: string) => void;
  onNavigateToRecipe?: (recipeId: string) => void;
}

export function ItemDetailDialog({ item, mode, onClose, onBack, onNavigateToItem, onNavigateToTag, onNavigateToRecipe }: ItemDetailDialogProps) {
  const { data, showItemIds } = useApp();
  const backdropClickHandlers = useBackdropClick(onBack || onClose);

  const targetType = 'itemId' in item ? 'item' : 'tag';
  const sourceRecipes = mode === 'source'
    ? findRecipesForTarget(data, { type: targetType, id: item.id }, 'source')
    : [];
  const usageRecipes = mode === 'usage'
    ? findRecipesForTarget(data, { type: targetType, id: item.id }, 'usage')
    : [];
  const itemTags = mode === 'tags' && 'tags' in item
    ? item.tags.map(tagId => data.tags[tagId]).filter(Boolean)
    : [];

  const renderRecipe = (recipe: Recipe) => {
    const workstation = data.items[recipe.workstation];

    return (
      <div
        key={recipe.id}
        className="detail-recipe-card"
        onClick={() => onNavigateToRecipe?.(recipe.id)}
        {...entityDataAttributes({ type: 'recipe', id: recipe.id })}
      >
        <div className="recipe-name">{recipe.name}</div>
        {workstation && (
          <div className="recipe-workstation">
            <ItemDisplay
              icon="📦"
              name={workstation.name}
              id={showItemIds ? workstation.itemId : ''}
              entityType="item"
              entityId={workstation.id}
              onClick={() => {
                onNavigateToItem?.(workstation.id);
              }}
            />
          </div>
        )}
        <div className="recipe-detail-slots">
          {recipe.inputs.length > 0 && (
            <div className="slot-section">
              <span className="slot-section-label">输入:</span>
              {recipe.inputs.map((slot, idx) => {
                if (slot.type === 'item') {
                  const slotItem = data.items[slot.ref];
                  return slotItem ? (
                    <ItemDisplay
                      key={idx}
                      icon="📦"
                      name={slotItem.name}
                      id={showItemIds ? slotItem.itemId : ''}
                      count={slot.count}
                      entityType="item"
                      entityId={slotItem.id}
                      onClick={() => {
                        onNavigateToItem?.(slotItem.id);
                      }}
                    />
                  ) : null;
                } else {
                  const slotTag = data.tags[slot.ref];
                  return slotTag ? (
                    <ItemDisplay
                      key={idx}
                      icon="🏷️"
                      name={slotTag.name}
                      id=""
                      count={slot.count}
                      entityType="tag"
                      entityId={slotTag.id}
                      onClick={() => {
                        onNavigateToTag?.(slotTag.id);
                      }}
                    />
                  ) : null;
                }
              })}
            </div>
          )}
          {recipe.attachments.length > 0 && (
            <div className="slot-section">
              <span className="slot-section-label">附加:</span>
              {recipe.attachments.map((slot, idx) => {
                if (slot.type === 'item') {
                  const slotItem = data.items[slot.ref];
                  return slotItem ? (
                    <ItemDisplay
                      key={idx}
                      icon="📦"
                      name={slotItem.name}
                      id={showItemIds ? slotItem.itemId : ''}
                      count={slot.count}
                      entityType="item"
                      entityId={slotItem.id}
                      onClick={() => {
                        onNavigateToItem?.(slotItem.id);
                      }}
                    />
                  ) : null;
                } else {
                  const slotTag = data.tags[slot.ref];
                  return slotTag ? (
                    <ItemDisplay
                      key={idx}
                      icon="🏷️"
                      name={slotTag.name}
                      id=""
                      count={slot.count}
                      entityType="tag"
                      entityId={slotTag.id}
                      onClick={() => {
                        onNavigateToTag?.(slotTag.id);
                      }}
                    />
                  ) : null;
                }
              })}
            </div>
          )}
          <div className="slot-section">
            <span className="slot-section-label">输出:</span>
            {recipe.outputs.map((slot, idx) => {
              if (slot.type === 'item') {
                const slotItem = data.items[slot.ref];
                return slotItem ? (
                  <ItemDisplay
                    key={idx}
                    icon="📦"
                    name={slotItem.name}
                    id={showItemIds ? slotItem.itemId : ''}
                    count={slot.count}
                    entityType="item"
                    entityId={slotItem.id}
                    onClick={() => {
                      onNavigateToItem?.(slotItem.id);
                    }}
                  />
                ) : null;
              } else {
                const slotTag = data.tags[slot.ref];
                return slotTag ? (
                  <ItemDisplay
                    key={idx}
                    icon="🏷️"
                    name={slotTag.name}
                    id=""
                    count={slot.count}
                    entityType="tag"
                    entityId={slotTag.id}
                    onClick={() => {
                      onNavigateToTag?.(slotTag.id);
                    }}
                  />
                ) : null;
              }
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div
        className="dialog dialog-large"
        onClick={e => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <h2 data-entity-type={targetType} data-entity-id={item.id}>
              {targetType === 'item' ? '📦' : '🏷️'} {item.name}
              {mode === 'source' && ' - 获取配方'}
              {mode === 'usage' && ' - 制作配方'}
              {mode === 'tags' && ' - 所在标签'}
            </h2>
            {showItemIds && 'itemId' in item && (
              <div className="item-id-display">{item.itemId}</div>
            )}
          </div>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {mode === 'source' && (
            <div className="detail-content">
              {sourceRecipes.length > 0 ? (
                sourceRecipes.map(renderRecipe)
              ) : (
                <div className="empty-state">该{targetType === 'item' ? '物品' : '标签'}没有获取配方</div>
              )}
            </div>
          )}

          {mode === 'usage' && (
            <div className="detail-content">
              {usageRecipes.length > 0 ? (
                usageRecipes.map(renderRecipe)
              ) : (
                <div className="empty-state">该{targetType === 'item' ? '物品' : '标签'}没有被用于任何配方</div>
              )}
            </div>
          )}

          {mode === 'tags' && (
            <div className="detail-content">
              {itemTags.length > 0 ? (
                <div className="tag-list">
                  {itemTags.map(tag => (
                    <div
                      key={tag.id}
                      className="tag-item-card"
                      onClick={() => onNavigateToTag?.(tag.id)}
                      {...entityDataAttributes({ type: 'tag', id: tag.id })}
                    >
                      <div className="tag-icon">🏷️</div>
                      <div className="tag-info">
                        <div className="tag-name">{tag.name}</div>
                        <div className="tag-count">{tag.items.length} 个物品</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">该物品不属于任何标签</div>
              )}
            </div>
          )}
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
