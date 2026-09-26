import { useApp } from '../../contexts/AppContext';
import { Recipe } from '../../types';
import { ItemDisplay } from '../common/ItemDisplay';
import { useBackdropClick } from '../common/useBackdropClick';

interface RecipeDetailDialogProps {
  recipe: Recipe;
  onClose: () => void;
  onBack?: () => void;
  onNavigateToItem: (itemId: string) => void;
  onNavigateToTag: (tagId: string) => void;
}

export function RecipeDetailDialog({ recipe, onClose, onBack, onNavigateToItem, onNavigateToTag }: RecipeDetailDialogProps) {
  const { data, showItemIds } = useApp();
  const backdropClickHandlers = useBackdropClick(onBack || onClose);
  const workstation = data.items[recipe.workstation];

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div
        className="dialog dialog-large"
        onClick={e => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 data-entity-type="recipe" data-entity-id={recipe.id}>📋 {recipe.name} - 配方详情</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="detail-content">
            {workstation && (
              <div className="detail-section">
                <div className="section-title">工作方块</div>
                <ItemDisplay
                  icon="📦"
                  name={workstation.name}
                  id={showItemIds ? workstation.itemId : ''}
                  entityType="item"
                  entityId={workstation.id}
                  onClick={(e) => {
                    e?.stopPropagation();
                    onNavigateToItem(workstation.id);
                  }}
                />
              </div>
            )}

            {recipe.inputs.length > 0 && (
              <div className="detail-section">
                <div className="section-title">输入槽位</div>
                <div className="recipe-detail-slots">
                  {recipe.inputs.map((slot, idx) => {
                    if (slot.type === 'item') {
                      const item = data.items[slot.ref];
                      return item ? (
                        <ItemDisplay
                          key={idx}
                          icon="📦"
                          name={item.name}
                          id={showItemIds ? item.itemId : ''}
                          count={slot.count}
                          entityType="item"
                          entityId={item.id}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onNavigateToItem(item.id);
                          }}
                        />
                      ) : null;
                    } else {
                      const tag = data.tags[slot.ref];
                      return tag ? (
                        <ItemDisplay
                          key={idx}
                          icon="🏷️"
                          name={tag.name}
                          id=""
                          count={slot.count}
                          entityType="tag"
                          entityId={tag.id}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onNavigateToTag(tag.id);
                          }}
                        />
                      ) : null;
                    }
                  })}
                </div>
              </div>
            )}

            {recipe.attachments.length > 0 && (
              <div className="detail-section">
                <div className="section-title">附加槽位</div>
                <div className="recipe-detail-slots">
                  {recipe.attachments.map((slot, idx) => {
                    if (slot.type === 'item') {
                      const item = data.items[slot.ref];
                      return item ? (
                        <ItemDisplay
                          key={idx}
                          icon="📦"
                          name={item.name}
                          id={showItemIds ? item.itemId : ''}
                          count={slot.count}
                          entityType="item"
                          entityId={item.id}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onNavigateToItem(item.id);
                          }}
                        />
                      ) : null;
                    } else {
                      const tag = data.tags[slot.ref];
                      return tag ? (
                        <ItemDisplay
                          key={idx}
                          icon="🏷️"
                          name={tag.name}
                          id=""
                          count={slot.count}
                          entityType="tag"
                          entityId={tag.id}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onNavigateToTag(tag.id);
                          }}
                        />
                      ) : null;
                    }
                  })}
                </div>
              </div>
            )}

            <div className="detail-section">
              <div className="section-title">输出槽位</div>
              <div className="recipe-detail-slots">
                {recipe.outputs.map((slot, idx) => {
                  if (slot.type === 'item') {
                    const item = data.items[slot.ref];
                    return item ? (
                      <ItemDisplay
                        key={idx}
                        icon="📦"
                        name={item.name}
                        id={showItemIds ? item.itemId : ''}
                        count={slot.count}
                        entityType="item"
                        entityId={item.id}
                        onClick={(e) => {
                          e?.stopPropagation();
                          onNavigateToItem(item.id);
                        }}
                      />
                    ) : null;
                  } else {
                    const tag = data.tags[slot.ref];
                    return tag ? (
                      <ItemDisplay
                        key={idx}
                        icon="🏷️"
                        name={tag.name}
                        id=""
                        count={slot.count}
                        entityType="tag"
                        entityId={tag.id}
                        onClick={(e) => {
                          e?.stopPropagation();
                          onNavigateToTag(tag.id);
                        }}
                      />
                    ) : null;
                  }
                })}
              </div>
            </div>
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
