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

type DialogState =
  | { type: 'quickMenu'; target: 'item' | 'tag' | 'recipe'; data: any }
  | { type: 'itemDetail'; item: any; mode: 'source' | 'usage' | 'tags' }
  | { type: 'tagDetail'; tag: any }
  | { type: 'recipeDetail'; recipe: any }
  | { type: 'itemEdit'; item: any }
  | { type: 'tagEdit'; tag: any }
  | { type: 'recipeEdit'; recipe: any };

export function GlobalNavigationHandler() {
  const { data, setData } = useApp();
  const { selectedItem, selectedTag, selectedRecipe, setSelectedItem, setSelectedTag, setSelectedRecipe, setRecipeTreeTarget } = useNavigation();
  const [dialogHistory, setDialogHistory] = useState<DialogState[]>([]);

  const currentDialog = dialogHistory.length > 0 ? dialogHistory[dialogHistory.length - 1] : null;

  const pushDialog = (dialog: DialogState) => {
    setDialogHistory(prev => [...prev, dialog]);
  };

  const popDialog = () => {
    setDialogHistory(prev => prev.slice(0, -1));
  };

  const closeAllDialogs = () => {
    setDialogHistory([]);
  };

  const handleItemSave = (item: any) => {
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
      const updatedTags: Record<string, any> = {};

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

  const handleTagSave = (tag: any) => {
    setData(prev => {
      const oldTag = prev.tags[tag.id];
      const oldItems = oldTag?.items || [];
      const newItems = tag.items || [];

      // 批量构建更新
      const updatedTags: Record<string, any> = {
        [tag.id]: tag
      };
      const updatedItems: Record<string, any> = {};

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

  const handleRecipeSave = (recipe: any) => {
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
      pushDialog({ type: 'quickMenu', target: 'item', data: selectedItem });
      setSelectedItem(null);
    }
  }, [selectedItem, setSelectedItem]);

  useEffect(() => {
    if (selectedTag) {
      pushDialog({ type: 'quickMenu', target: 'tag', data: selectedTag });
      setSelectedTag(null);
    }
  }, [selectedTag, setSelectedTag]);

  useEffect(() => {
    if (selectedRecipe) {
      pushDialog({ type: 'quickMenu', target: 'recipe', data: selectedRecipe });
      setSelectedRecipe(null);
    }
  }, [selectedRecipe, setSelectedRecipe]);

  return (
    <>
      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'item' && (
        <QuickMenu
          target={currentDialog.data}
          type="item"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'itemEdit', item: currentDialog.data });
          }}
          onViewSource={() => {
            pushDialog({ type: 'itemDetail', item: currentDialog.data, mode: 'source' });
          }}
          onViewUsage={() => {
            pushDialog({ type: 'itemDetail', item: currentDialog.data, mode: 'usage' });
          }}
          onViewTags={() => {
            pushDialog({ type: 'itemDetail', item: currentDialog.data, mode: 'tags' });
          }}
          onViewRecipeTree={() => {
            setRecipeTreeTarget({ id: currentDialog.data.id, type: 'item' });
            closeAllDialogs();
          }}
        />
      )}

      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'tag' && (
        <QuickMenu
          target={currentDialog.data}
          type="tag"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'tagEdit', tag: currentDialog.data });
          }}
          onViewDetail={() => {
            pushDialog({ type: 'tagDetail', tag: currentDialog.data });
          }}
          onViewSource={() => {
            pushDialog({ type: 'itemDetail', item: currentDialog.data, mode: 'source' });
          }}
          onViewUsage={() => {
            pushDialog({ type: 'itemDetail', item: currentDialog.data, mode: 'usage' });
          }}
          onViewRecipeTree={() => {
            setRecipeTreeTarget({ id: currentDialog.data.id, type: 'tag' });
            closeAllDialogs();
          }}
        />
      )}

      {currentDialog?.type === 'quickMenu' && currentDialog.target === 'recipe' && (
        <QuickMenu
          target={currentDialog.data}
          type="recipe"
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onEdit={() => {
            pushDialog({ type: 'recipeEdit', recipe: currentDialog.data });
          }}
          onViewDetail={() => {
            pushDialog({ type: 'recipeDetail', recipe: currentDialog.data });
          }}
        />
      )}

      {currentDialog?.type === 'itemDetail' && (
        <ItemDetailDialog
          item={currentDialog.item}
          mode={currentDialog.mode}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            const item = data.items[itemId];
            if (item) pushDialog({ type: 'quickMenu', target: 'item', data: item });
          }}
          onNavigateToTag={(tagId) => {
            const tag = data.tags[tagId];
            if (tag) pushDialog({ type: 'quickMenu', target: 'tag', data: tag });
          }}
          onNavigateToRecipe={(recipeId) => {
            const recipe = data.recipes[recipeId];
            if (recipe) pushDialog({ type: 'quickMenu', target: 'recipe', data: recipe });
          }}
        />
      )}

      {currentDialog?.type === 'tagDetail' && (
        <TagDetailDialog
          tag={currentDialog.tag}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            const item = data.items[itemId];
            if (item) pushDialog({ type: 'quickMenu', target: 'item', data: item });
          }}
          onNavigateToTag={(tagId) => {
            const tag = data.tags[tagId];
            if (tag) pushDialog({ type: 'tagDetail', tag: tag });
          }}
        />
      )}

      {currentDialog?.type === 'recipeDetail' && (
        <RecipeDetailDialog
          recipe={currentDialog.recipe}
          onClose={closeAllDialogs}
          onBack={dialogHistory.length > 1 ? popDialog : undefined}
          onNavigateToItem={(itemId) => {
            const item = data.items[itemId];
            if (item) pushDialog({ type: 'quickMenu', target: 'item', data: item });
          }}
          onNavigateToTag={(tagId) => {
            const tag = data.tags[tagId];
            if (tag) pushDialog({ type: 'quickMenu', target: 'tag', data: tag });
          }}
        />
      )}

      {currentDialog?.type === 'itemEdit' && (
        <ItemEditDialog
          item={currentDialog.item}
          onSave={handleItemSave}
          onDelete={() => handleItemDelete(currentDialog.item.id)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}

      {currentDialog?.type === 'tagEdit' && (
        <TagEditDialog
          tag={currentDialog.tag}
          onSave={handleTagSave}
          onDelete={() => handleTagDelete(currentDialog.tag.id)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}

      {currentDialog?.type === 'recipeEdit' && (
        <RecipeEditDialog
          recipe={currentDialog.recipe}
          onSave={handleRecipeSave}
          onDelete={() => handleRecipeDelete(currentDialog.recipe.id)}
          onCancel={popDialog}
          onClose={closeAllDialogs}
        />
      )}
    </>
  );
}
