import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Recipe } from '../../types';
import { RecipeSearch, RecipeSearchOptions } from '../../data/recipeSearch';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { RecipeEditDialog } from './RecipeEditDialog';

export function RecipeList() {
  const { data, setData } = useApp();
  const [searchOptions, setSearchOptions] = useState<RecipeSearchOptions>({});
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const recipes = RecipeSearch.search(data, searchOptions);

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSave = (recipe: Recipe) => {
    setData(prev => ({
      ...prev,
      recipes: {
        ...prev.recipes,
        [recipe.id]: recipe
      }
    }));
    setEditingRecipe(null);
    setIsCreating(false);
  };

  const handleDelete = (recipeId: string) => {
    if (!confirm('确定删除该配方吗？')) return;

    const newData = { ...data };
    delete newData.recipes[recipeId];
    setData(newData);
  };

  return (
    <div className="recipe-list-container">
      <div className="list-header">
        <SearchInput
          placeholder="搜索配方名称..."
          onSearch={(text) => setSearchOptions({ ...searchOptions, text })}
        />
        <button
          className="btn-secondary"
          onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
        >
          {showAdvancedSearch ? '收起筛选' : '高级筛选'}
        </button>
        <button className="btn-primary" onClick={handleCreate}>+ 新建配方</button>
      </div>

      {showAdvancedSearch && (
        <div className="advanced-search">
          <div className="search-row">
            <label>工作方块:</label>
            <select
              value={searchOptions.workstation || ''}
              onChange={e => setSearchOptions({ ...searchOptions, workstation: e.target.value || undefined })}
            >
              <option value="">全部</option>
              {Object.values(data.items).map(item => (
                <option key={item.id} value={item.id}>📦 {item.name}</option>
              ))}
            </select>
          </div>

          <div className="search-row">
            <label>输入物品:</label>
            <select
              value={searchOptions.input || ''}
              onChange={e => setSearchOptions({ ...searchOptions, input: e.target.value || undefined })}
            >
              <option value="">全部</option>
              {Object.values(data.items).map(item => (
                <option key={item.id} value={item.id}>📦 {item.name}</option>
              ))}
            </select>
          </div>

          <div className="search-row">
            <label>附加物品:</label>
            <select
              value={searchOptions.attachment || ''}
              onChange={e => setSearchOptions({ ...searchOptions, attachment: e.target.value || undefined })}
            >
              <option value="">全部</option>
              {Object.values(data.items).map(item => (
                <option key={item.id} value={item.id}>📦 {item.name}</option>
              ))}
            </select>
          </div>

          <div className="search-row">
            <label>输出物品:</label>
            <select
              value={searchOptions.output || ''}
              onChange={e => setSearchOptions({ ...searchOptions, output: e.target.value || undefined })}
            >
              <option value="">全部</option>
              {Object.values(data.items).map(item => (
                <option key={item.id} value={item.id}>📦 {item.name}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setSearchOptions({})}
          >
            清空筛选
          </button>
        </div>
      )}

      <div className="recipe-list">
        {recipes.map(recipe => {
          const workstation = data.items[recipe.workstation];
          return (
            <div key={recipe.id} className="recipe-card" onClick={() => setEditingRecipe(recipe)}>
              <div className="recipe-header">
                <h3>{recipe.name}</h3>
                {workstation && (
                  <ItemDisplay icon="📦" name={workstation.name} id={workstation.itemId} />
                )}
              </div>
              <div className="recipe-slots">
                <div className="slot-group">
                  <span className="slot-label">输入:</span>
                  {recipe.inputs.map((slot, idx) => {
                    const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                    return ref ? (
                      <span key={idx} className="slot-item">
                        {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                      </span>
                    ) : null;
                  })}
                </div>
                {recipe.attachments.length > 0 && (
                  <div className="slot-group">
                    <span className="slot-label">附加:</span>
                    {recipe.attachments.map((slot, idx) => {
                      const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                      return ref ? (
                        <span key={idx} className="slot-item">
                          {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="slot-group">
                  <span className="slot-label">输出:</span>
                  {recipe.outputs.map((slot, idx) => {
                    const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                    return ref ? (
                      <span key={idx} className="slot-item">
                        {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {recipes.length === 0 && (
          <div className="empty-state">暂无配方</div>
        )}
      </div>

      {(editingRecipe || isCreating) && (
        <RecipeEditDialog
          recipe={editingRecipe}
          onSave={handleSave}
          onDelete={editingRecipe ? () => handleDelete(editingRecipe.id) : undefined}
          onCancel={() => {
            setEditingRecipe(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
