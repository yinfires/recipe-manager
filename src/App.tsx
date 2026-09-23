import { useState } from 'react';
import { ItemList } from './components/ItemManager/ItemList';
import { TagList } from './components/TagManager/TagList';
import { RecipeList } from './components/RecipeManager/RecipeList';
import { RecipeTree } from './components/RecipeManager/RecipeTree';
import { IdToggle } from './components/common/IdToggle';
import './App.css';

type Tab = 'items' | 'tags' | 'recipes' | 'tree';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('items');

  return (
    <div className="app">
      <div className="app-header">
        <div className="tab-nav">
          <button
            className={activeTab === 'items' ? 'active' : ''}
            onClick={() => setActiveTab('items')}
          >
            物品管理
          </button>
          <button
            className={activeTab === 'tags' ? 'active' : ''}
            onClick={() => setActiveTab('tags')}
          >
            标签管理
          </button>
          <button
            className={activeTab === 'recipes' ? 'active' : ''}
            onClick={() => setActiveTab('recipes')}
          >
            配方管理
          </button>
          <button
            className={activeTab === 'tree' ? 'active' : ''}
            onClick={() => setActiveTab('tree')}
          >
            配方树
          </button>
        </div>
        <div className="app-header-right">
          <IdToggle />
        </div>
      </div>

      <div className="app-main">
        {activeTab === 'items' && <ItemList />}
        {activeTab === 'tags' && <TagList />}
        {activeTab === 'recipes' && <RecipeList />}
        {activeTab === 'tree' && <RecipeTree />}
      </div>
    </div>
  );
}

export default App;
