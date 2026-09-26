import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { QuickMenu } from './QuickMenu';
import { ItemDetailDialog } from '../ItemManager/ItemDetailDialog';
import { TagDetailDialog } from '../TagManager/TagDetailDialog';
import { RecipeDetailDialog } from '../RecipeManager/RecipeDetailDialog';
import { ItemEditDialog } from '../ItemManager/ItemEditDialog';
import { TagEditDialog } from '../TagManager/TagEditDialog';
import { RecipeEditDialog } from '../RecipeManager/RecipeEditDialog';
import { useState, useEffect } from 'react';
import { Item, Recipe, Tag } from '../../types';
import { getEntityTarget } from '../../utils/entityTarget';

interface GlobalNavigationHandlerProps {
  shortcutsDisabled?: boolean;
}

type DialogState =
  | { type: 'quickMenu'; target: 'item' | 'tag' | 'recipe'; entityId: string }
  | { type: 'itemDetail'; target: 'item' | 'tag'; entityId: string; mode: 'source' | 'usage' | 'tags' }
  | { type: 'tagDetail'; tagId: string }
  | { type: 'recipeDetail'; recipeId: string }
  | { type: 'itemEdit'; itemId: string }
  | { type: 'tagEdit'; tagId: string }
  | { type: 'recipeCreate'; outputItemId: string }
  | { type: 'recipeEdit'; recipeId: string };

export function GlobalNavigationHandler({ shortcutsDisabled = false }: GlobalNavigationHandlerProps) {
  const { data, setData } = useApp();
  const { selectedItem, selectedTag, selectedRecipe, setSelectedItem, setSelectedTag, setSelectedRecipe, setRecipeTreeTarget } = useNavigation();
  const [dialogHistory, setDialogHistory] = useState<DialogState[]>([]);

  const currentDialog = dialogHistory.length > 0 ? dialogHistory[dialogHistory.length - 1] : null;
  const currentQuickMenuTarget = currentDialog?.type === 'quickMenu'
    ? currentDialog.target === 'item'
      ? data.items[currentDialog.entityId]
      : currentDialog.target === 'tag'
        ? data.tags[currentDialog.entityId]
        : data.recipes[currentDialog.entityId]
    : undefined;
  const currentItemDetailTarget = currentDialog?.type === 'itemDetail'
    ? currentDialog.target === 'item'
      ? data.items[currentDialog.entityId]
      : data.tags[currentDialog.entityId]
    : undefined;
  const currentTag = currentDialog?.type === 'tagDetail' || currentDialog?.type === 'tagEdit'
    ? data.tags[currentDialog.tagId]
    : undefined;
  const currentRecipe = currentDialog?.type === 'recipeDetail' || currentDialog?.type === 'recipeEdit'
    ? data.recipes[currentDialog.recipeId]
    : undefined;
  const currentItem = currentDialog?.type === 'itemEdit'
    ? data.items[currentDialog.itemId]
    : undefined;

  const pushDialog = (dialog: DialogState) => {
    setDialogHistory(prev => [...prev, dialog]);
  };

  const popDialog = () => {
    setDialogHistory(prev => prev.slice(0, -1));
  };

  const closeAllDialogs = () => {
    setDialogHistory([]);
  };

  useEffect(() => {
    let pointerX = -1;
    let pointerY = -1;

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const focused = event.target as HTMLElement | null;
      const isEditable = focused?.matches('input, textarea, select, [contenteditable="true"]');
      if (
        shortcutsDisabled ||
        isEditable ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        pointerX < 0 ||
        pointerY < 0
      ) return;

      const target = getEntityTarget(document.elementFromPoint(pointerX, pointerY));
      if (!target) return;

      const key = event.key.toLowerCase();
      let nextDialog: DialogState | null = null;

      if ((key === 'r' || key === 'u') && target.type !== 'recipe') {
        nextDialog = {
          type: 'itemDetail',
          target: target.type,
          entityId: target.id,
          mode: key === 'r' ? 'source' : 'usage'
        };
      } else if (key === 't' && target.type !== 'recipe') {
        setRecipeTreeTarget({ id: target.id, type: target.type });
        closeAllDialogs();
        event.preventDefault();
        return;
      } else if (key === 'a' && target.type === 'item') {
        nextDialog = { type: 'recipeCreate', outputItemId: target.id };
      } else if (key === 'w') {
        nextDialog = target.type === 'item'
          ? { type: 'itemEdit', itemId: target.id }
          : target.type === 'tag'
            ? { type: 'tagEdit', tagId: target.id }
            : { type: 'recipeEdit', recipeId: target.id };
      } else if (key === 's') {
        nextDialog = target.type === 'item'
          ? { type: 'itemDetail', target: 'item', entityId: target.id, mode: 'tags' }
          : target.type === 'tag'
            ? { type: 'tagDetail', tagId: target.id }
            : { type: 'recipeDetail', recipeId: target.id };
      }

      if (nextDialog) {
        pushDialog(nextDialog);
        event.preventDefault();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcutsDisabled, setRecipeTreeTarget]);

  const handleItemSave = (item: Item) => {
    setData(prev => {
      const oldItem = prev.items[item.id];
      const oldTags = oldItem?.tags || [];
      const newTags = item.tags || [];

      // 一次性构建新的状态
      const newData = {
        ...prev,
        items: {
          ...prev.items,
          [item.id]: item
        }
      };

      // 批量更新标签
      const updatedTags: Record<string, Tag> = {};

      // 从旧标签中移除此物品
      oldTags.forEach((tagId: string) => {
        if (!newTags.includes(tagId)) {
          const tag = newData.tags[tagId];
          if (tag && !updatedTags[tagId]) {
            updatedTags[tagId] = {
              ...tag,
              items: tag.items.filter(id => id !== item.id)
            };
          }
        }
      });

      // 在新标签中添加此物品
      newTags.forEach((tagId: string) => {
        const tag = updatedTags[tagId] || newData.tags[tagId];
        if (tag) {
          if (!tag.items.includes(item.id)) {
            updatedTags[tagId] = {
              ...tag,
              items: [...tag.items, item.id]
            };
          }
        }
      });

      // 只有当有标签更新时才更新 tags 对象
      if (Object.keys(updatedTags).length > 0) {
        newData.tags = {
          ...newData.tags,
          ...updatedTags
        };
      }

      return newData;
    });
    popDialog();
  };

  const handleItemDelete = (itemId: string) => {
    if (!confirm('确定删除该物品吗？')) return;
    const newData = { ...data };
    delete newData.items[itemId];
    Object.keys(newData.tags).forEach(tagId => {
      newData.tags[tagId] = {
        ...newData.tags[tagId],
        items: newData.tags[tagId].items.filter(id => id !== itemId)
      };
    });
    setData(newData);
    closeAllDialogs();
  };

  const handleTagSave = (tag: Tag) => {
    setData(prev => {
      const oldTag = prev.tags[tag.id];
      const oldItems = oldTag?.items || [];
      const newItems = tag.items || [];

      // 批量构建更新
      const updatedTags: Record<string, Tag> = {
        [tag.id]: tag
      };
      const updatedItems: Record<string, Item> = {};

      // 同步子标签的父标签引用
      tag.childTags.forEach((childId: string) => {
        const childTag = updatedTags[childId] || prev.tags[childId];
        if (childTag && !childTag.parentTags.includes(tag.id)) {
          updatedTags[childId] = {
            ...childTag,
            parentTags: [...childTag.parentTags, tag.id]
          };
        }
      });

      // 从旧物品中移除标签
      oldItems.forEach((itemId: string) => {
        if (!newItems.includes(itemId)) {
          const item = prev.items[itemId];
          if (item) {
            updatedItems[itemId] = {
              ...item,
              tags: item.tags.filter((id: string) => id !== tag.id)
            };
          }
        }
      });

      // 在新物品中添加标签
      newItems.forEach((itemId: string) => {
        const item = updatedItems[itemId] || prev.items[itemId];
        const itemTags = item?.tags || [];
        if (item && !itemTags.includes(tag.id)) {
          updatedItems[itemId] = {
            ...item,
            tags: [...itemTags, tag.id]
          };
        }
      });

      return {
        ...prev,
        tags: {
          ...prev.tags,
          ...updatedTags
        },
        items: {
          ...prev.items,
          ...updatedItems
        }
      };
    });
    popDialog();
  };

  const handleTagDelete = (tagId: string) => {
    if (!confirm('确定删除该标签吗？')) return;
    const newData = { ...data };
    const tag = newData.tags[tagId];

    if (!tag) return;

    tag.parentTags.forEach(parentId => {
      if (newData.tags[parentId]) {
        newData.tags[parentId] = {
          ...newData.tags[parentId],
          childTags: newData.tags[parentId].childTags.filter(id => id !== tagId)
        };
      }
    });

    tag.childTags.forEach(childId => {
      if (newData.tags[childId]) {
        newData.tags[childId] = {
          ...newData.tags[childId],
          parentTags: newData.tags[childId].parentTags.filter(id => id !== tagId)
        };
      }
    });

    delete newData.tags[tagId];
    setData(newData);
    closeAllDialogs();
  };

  const handleRecipeSave = (recipe: Recipe) => {
    setData(prev => ({
      ...prev,
      recipes: {
        ...prev.recipes,
        [recipe.id]: recipe
      }
    }));
    popDialog();
  };

  const handleRecipeDelete = (recipeId: string) => {
    if (!confirm('确定删除该配方吗？')) return;
    const newData = { ...data };
    delete newData.recipes[recipeId];
    setData(newData);
    closeAllDialogs();
  };

  // 监听 selectedItem/selectedTag/selectedRecipe 的变化，转换为 dialog
  useEffect(() => {
    if (selectedItem) {
      pushDialog({ type: 'quickMenu', target: 'item', entityId: selectedItem.id });
      setSelectedItem(null);
    }
  }, [selectedItem, setSelectedItem]);

  useEffect(() => {
    if (selectedTag) {
      pushDialog({ type: 'quickMenu', target: 'tag', entityId: selectedTag.id });
      setSelectedTag(null);
    }
  }, [selectedTag, setSelectedTag]);

  useEffect(() => {
    if (selectedRecipe) {
      pushDialog({ type: 'quickMenu', target: 'recipe', entityId: selectedRecipe.id });
      setSelectedRecipe(null);
    }
  }, [selectedRecipe, setSelectedRecipe]);

  return (
    <>
      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'item' && currentQuickMenuTarget && (
        <QuickMenu
          target={currentQuickMenuTarget}
          type="item"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'itemEdit', itemId: currentDialog.entityId });
          }}
          onViewSource={() => {
            pushDialog({ type: 'itemDetail', target: 'item', entityId: currentDialog.entityId, mode: 'source' });
          }}
          onAddSourceRecipe={() => {
            pushDialog({ type: 'recipeCreate', outputItemId: currentDialog.entityId });
          }}
          onViewUsage={() => {
            pushDialog({ type: 'itemDetail', target: 'item', entityId: currentDialog.entityId, mode: 'usage' });
          }}
          onViewTags={() => {
            pushDialog({ type: 'itemDetail', target: 'item', entityId: currentDialog.entityId, mode: 'tags' });
          }}
          onViewRecipeTree={() => {
            setRecipeTreeTarget({ id: currentDialog.entityId, type: 'item' });
            closeAllDialogs();
          }}
        />
      )}

      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'tag' && currentQuickMenuTarget && (
        <QuickMenu
          target={currentQuickMenuTarget}
          type="tag"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'tagEdit', tagId: currentDialog.entityId });
          }}
          onViewDetail={() => {
            pushDialog({ type: 'tagDetail', tagId: currentDialog.entityId });
          }}
          onViewSource={() => {
            pushDialog({ type: 'itemDetail', target: 'tag', entityId: currentDialog.entityId, mode: 'source' });
          }}
          onViewUsage={() => {
            pushDialog({ type: 'itemDetail', target: 'tag', entityId: currentDialog.entityId, mode: 'usage' });
          }}
          onViewRecipeTree={() => {
            setRecipeTreeTarget({ id: currentDialog.entityId, type: 'tag' });
            closeAllDialogs();
          }}
        />
      )}

      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'recipe' && currentQuickMenuTarget && (
        <QuickMenu
          target={currentQuickMenuTarget}
          type="recipe"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'recipeEdit', recipeId: currentDialog.entityId });
          }}
          onViewDetail={() => {
            pushDialog({ type: 'recipeDetail', recipeId: currentDialog.entityId });
          }}
        />
      )}

      {currentDialog?.type === 'itemDetail' && currentItemDetailTarget && (
        <ItemDetailDialog
          item={currentItemDetailTarget}
          mode={currentDialog.mode}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            if (data.items[itemId]) pushDialog({ type: 'quickMenu', target: 'item', entityId: itemId });
          }}
          onNavigateToTag={(tagId) => {
            if (data.tags[tagId]) pushDialog({ type: 'quickMenu', target: 'tag', entityId: tagId });
          }}
          onNavigateToRecipe={(recipeId) => {
            if (data.recipes[recipeId]) pushDialog({ type: 'quickMenu', target: 'recipe', entityId: recipeId });
          }}
        />
      )}

      {currentDialog?.type === 'tagDetail' && currentTag && (
        <TagDetailDialog
          tag={currentTag}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            if (data.items[itemId]) pushDialog({ type: 'quickMenu', target: 'item', entityId: itemId });
          }}
          onNavigateToTag={(tagId) => {
            if (data.tags[tagId]) pushDialog({ type: 'tagDetail', tagId });
          }}
        />
      )}

      {currentDialog?.type === 'recipeDetail' && currentRecipe && (
        <RecipeDetailDialog
          recipe={currentRecipe}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            if (data.items[itemId]) pushDialog({ type: 'quickMenu', target: 'item', entityId: itemId });
          }}
          onNavigateToTag={(tagId) => {
            if (data.tags[tagId]) pushDialog({ type: 'quickMenu', target: 'tag', entityId: tagId });
          }}
        />
      )}

      {currentDialog?.type === 'itemEdit' && currentItem && (
        <ItemEditDialog
          item={currentItem}
          onSave={handleItemSave}
          onDelete={() => handleItemDelete(currentDialog.itemId)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}

      {currentDialog?.type === 'tagEdit' && currentTag && (
        <TagEditDialog
          tag={currentTag}
          onSave={handleTagSave}
          onDelete={() => handleTagDelete(currentDialog.tagId)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}

      {currentDialog?.type === 'recipeEdit' && currentRecipe && (
        <RecipeEditDialog
          recipe={currentRecipe}
          onSave={handleRecipeSave}
          onDelete={() => handleRecipeDelete(currentDialog.recipeId)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}

      {currentDialog?.type === 'recipeCreate' && data.items[currentDialog.outputItemId] && (
        <RecipeEditDialog
          recipe={null}
          initialOutputs={[{ type: 'item', ref: currentDialog.outputItemId, count: 1 }]}
          onSave={handleRecipeSave}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}
    </>
  );
}
