import { useApp } from '../../contexts/AppContext';
import { Item, Recipe } from '../../types';
import { ItemDisplay } from '../common/ItemDisplay';

interface ItemDetailDialogProps {
  item: Item;
  mode: 'source' | 'usage' | 'tags';
  onClose: () => void;
  onBack?: () => void;
  onNavigateToItem?: (itemId: string) => void;
  onNavigateToTag?: (tagId: string) => void;
  onNavigateToRecipe?: (recipeId: string) => void;
}

export function ItemDetailDialog({ item, mode, onClose, onBack, onNavigateToItem, onNavigateToTag, onNavigateToRecipe }: ItemDetailDialogProps) {
  const { data, showItemIds } = useApp();

  // 递归获取标签的所有父标签
  const getAllParentTags = (tagIds: string[]): string[] => {
    const result = new Set<string>(tagIds);
    const toProcess = [...tagIds];

    while (toProcess.length > 0) {
      const currentTagId = toProcess.pop()!;
      const tag = data.tags[currentTagId];
      if (tag?.parentTags) {
        tag.parentTags.forEach(parentId => {
          if (!result.has(parentId)) {
            result.add(parentId);
            toProcess.push(parentId);
          }
        });
      }
    }

    return Array.from(result);
  };

  // 获取物品的所有相关配方（包括标签配方及父标签配方）
  const getItemRecipes = (itemId: string, isSource: boolean): Recipe[] => {
    const targetItem = data.items[itemId];

    let allTags: string[] = [];

    if (targetItem) {
      // 如果是物品，获取其所有标签（包括父标签）
      const itemTags = targetItem.tags || [];
      allTags = getAllParentTags(itemTags);
    } else {
      // 如果是标签，直接使用该标签及其父标签
      const tag = data.tags[itemId];
      if (tag) {
        allTags = getAllParentTags([itemId]);
      } else {
        return [];
      }
    }

    return Object.values(data.recipes).filter(recipe => {
      if (isSource) {
        // 查找输出配方
        return recipe.outputs.some(slot =>
          (slot.type === 'item' && slot.ref === itemId) ||
          (slot.type === 'tag' && allTags.includes(slot.ref))
        );
      } else {
        // 查找消耗配方
        const allSlots = [...recipe.inputs, ...recipe.attachments];
        return allSlots.some(slot =>
          (slot.type === 'item' && slot.ref === itemId) ||
          (slot.type === 'tag' && allTags.includes(slot.ref))
        );
      }
    });
  };

  const sourceRecipes = mode === 'source' ? getItemRecipes(item.id, true) : [];
  const usageRecipes = mode === 'usage' ? getItemRecipes(item.id, false) : [];
  const itemTags = mode === 'tags' ? item.tags.map(tagId => data.tags[tagId]).filter(Boolean) : [];

  const renderRecipe = (recipe: Recipe) => {
    const workstation = data.items[recipe.workstation];

    return (
      <div
        key={recipe.id}
        className="detail-recipe-card"
        onClick={() => onNavigateToRecipe?.(recipe.id)}
      >
        <div className="recipe-name">{recipe.name}</div>
        {workstation && (
          <div className="recipe-workstation">
            <ItemDisplay
              icon="📦"
              name={workstation.name}
              id={showItemIds ? workstation.itemId : ''}
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
    <div className="dialog-overlay" onClick={onBack || onClose}>
      <div className="dialog dialog-large" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <h2>
              📦 {item.name}
              {mode === 'source' && ' - 获取配方'}
              {mode === 'usage' && ' - 制作配方'}
              {mode === 'tags' && ' - 所在标签'}
            </h2>
            {showItemIds && <div className="item-id-display">{item.itemId}</div>}
          </div>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {mode === 'source' && (
            <div className="detail-content">
              {sourceRecipes.length > 0 ? (
                sourceRecipes.map(renderRecipe)
              ) : (
                <div className="empty-state">该物品没有获取配方</div>
              )}
            </div>
          )}

          {mode === 'usage' && (
            <div className="detail-content">
              {usageRecipes.length > 0 ? (
                usageRecipes.map(renderRecipe)
              ) : (
                <div className="empty-state">该物品没有被用于任何配方</div>
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
