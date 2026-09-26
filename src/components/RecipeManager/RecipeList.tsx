import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Recipe } from '../../types';
import { RecipeSearch, RecipeSearchOptions } from '../../data/recipeSearch';
import { SearchInput } from '../common/SearchInput';
import { ItemDisplay } from '../common/ItemDisplay';
import { RecipeEditDialog } from './RecipeEditDialog';
import { ItemSelector } from '../common/ItemSelector';

export function RecipeList() {
  const { data, setData } = useApp();
  const { setSelectedRecipe } = useNavigation();
  const [searchOptions, setSearchOptions] = useState<RecipeSearchOptions>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const workstationTag = Object.values(data.tags).find(tag => tag.name === '工作方块');
  const workstationItemIds = workstationTag?.items || [];

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
    setIsCreating(false);
  };

  return (
    <div className="recipe-list-container">
      <div className="list-header recipe-list-toolbar">
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
          <div className="search-row advanced-search-field">
            <label>工作方块:</label>
            <ItemSelector
              value={searchOptions.workstation ? { type: 'item', ref: searchOptions.workstation } : undefined}
              onChange={(value) => setSearchOptions({ ...searchOptions, workstation: value?.ref })}
              placeholder="全部"
              allowTags={false}
              allowedItemIds={workstationItemIds}
            />
          </div>

          <div className="search-row advanced-search-field">
            <label>输入物品:</label>
            <ItemSelector
              value={searchOptions.input ? { type: 'item', ref: searchOptions.input } : undefined}
              onChange={(value) => setSearchOptions({ ...searchOptions, input: value?.ref })}
              placeholder="全部"
              allowTags={false}
            />
          </div>

          <div className="search-row advanced-search-field">
            <label>附加物品:</label>
            <ItemSelector
              value={searchOptions.attachment ? { type: 'item', ref: searchOptions.attachment } : undefined}
              onChange={(value) => setSearchOptions({ ...searchOptions, attachment: value?.ref })}
              placeholder="全部"
              allowTags={false}
            />
          </div>

          <div className="search-row advanced-search-field">
            <label>输出物品:</label>
            <ItemSelector
              value={searchOptions.output ? { type: 'item', ref: searchOptions.output } : undefined}
              onChange={(value) => setSearchOptions({ ...searchOptions, output: value?.ref })}
              placeholder="全部"
              allowTags={false}
            />
          </div>

          <button
            className="btn-secondary advanced-search-clear"
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
            <div
              key={recipe.id}
              className="recipe-card"
              data-entity-type="recipe"
              data-entity-id={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="recipe-header">
                <div className="recipe-title-block">
                  <span className="recipe-card-eyebrow">配方</span>
                  <h3>{recipe.name}</h3>
                </div>
                {workstation && (
                  <div className="recipe-workstation-badge">
                    <span className="recipe-section-caption">工作方块</span>
                    <ItemDisplay
                      icon="📦"
                      name={workstation.name}
                      id={workstation.itemId}
                      entityType="item"
                      entityId={workstation.id}
                    />
                  </div>
                )}
              </div>
              <div className="recipe-slots">
                <div className="recipe-slot-section recipe-slot-inputs">
                  <div className="recipe-slot-heading">
                    <span>输入</span>
                    <span className="slot-count-badge">{recipe.inputs.length}</span>
                  </div>
                  <div className="slot-group">
                    {recipe.inputs.length === 0 && <span className="slot-empty">无输入</span>}
                    {recipe.inputs.map((slot, idx) => {
                      const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                      return ref ? (
                        <span
                          key={idx}
                          className="slot-item"
                          data-entity-type={slot.type}
                          data-entity-id={slot.ref}
                        >
                          {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                {recipe.attachments.length > 0 && (
                  <div className="recipe-slot-section recipe-slot-attachments">
                    <div className="recipe-slot-heading">
                      <span>附加</span>
                      <span className="slot-count-badge">{recipe.attachments.length}</span>
                    </div>
                    <div className="slot-group">
                      {recipe.attachments.map((slot, idx) => {
                        const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                        return ref ? (
                          <span
                            key={idx}
                            className="slot-item"
                            data-entity-type={slot.type}
                            data-entity-id={slot.ref}
                          >
                            {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="recipe-slot-section recipe-slot-outputs">
                  <div className="recipe-slot-heading">
                    <span>输出</span>
                    <span className="slot-count-badge">{recipe.outputs.length}</span>
                  </div>
                  <div className="slot-group">
                    {recipe.outputs.length === 0 && <span className="slot-empty">无输出</span>}
                    {recipe.outputs.map((slot, idx) => {
                      const ref = slot.type === 'item' ? data.items[slot.ref] : data.tags[slot.ref];
                      return ref ? (
                        <span
                          key={idx}
                          className="slot-item"
                          data-entity-type={slot.type}
                          data-entity-id={slot.ref}
                        >
                          {slot.type === 'item' ? '📦' : '🏷️'} {ref.name} ×{slot.count}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {recipes.length === 0 && (
          <div className="empty-state">暂无配方</div>
        )}
      </div>

      {isCreating && (
        <RecipeEditDialog
          recipe={null}
          onSave={handleSave}
          onDelete={undefined}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}
