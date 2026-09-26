import { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ItemList } from './components/ItemManager/ItemList';
import { TagList } from './components/TagManager/TagList';
import { RecipeList } from './components/RecipeManager/RecipeList';
import { RecipeTree } from './components/RecipeManager/RecipeTree';
import { ThemeToggle } from './components/common/ThemeToggle';
import { GlobalNavigationHandler } from './components/common/GlobalNavigationHandler';
import { UrlItemImporter } from './components/common/UrlItemImporter';
import { ShortcutHelpDialog } from './components/common/ShortcutHelpDialog';
import './App.css';

export type TabType = 'items' | 'tags' | 'recipes' | 'tree';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('items');

  return (
    <AppProvider>
      <NavigationProvider>
        <AppContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </NavigationProvider>
    </AppProvider>
  );
}

function AppContent({ activeTab, setActiveTab }: { activeTab: TabType; setActiveTab: (tab: TabType) => void }) {
  const { recipeTreeTarget } = useNavigation();
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // 监听配方树导航请求
  useEffect(() => {
    if (recipeTreeTarget && activeTab !== 'tree') {
      setActiveTab('tree');
    }
  }, [recipeTreeTarget, activeTab, setActiveTab]);

  return (
    <div className="app">
          <header className="app-header">
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
              <button
                type="button"
                className="shortcut-help-button"
                onClick={() => setShowShortcutHelp(true)}
                title="查看快捷键"
                aria-label="查看快捷键"
              >
                ⌨️
              </button>
              <ThemeToggle />
            </div>
          </header>

          <main className="app-main">
            {activeTab === 'items' && <ItemList />}
            {activeTab === 'tags' && <TagList />}
            {activeTab === 'recipes' && <RecipeList />}
            {activeTab === 'tree' && <RecipeTree />}
          </main>

          <GlobalNavigationHandler shortcutsDisabled={showShortcutHelp} />
          <UrlItemImporter />
          {showShortcutHelp && <ShortcutHelpDialog onClose={() => setShowShortcutHelp(false)} />}
        </div>
  );
}

export default App;
