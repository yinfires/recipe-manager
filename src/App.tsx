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
import { PriceHelpDialog } from './components/common/PriceHelpDialog';
import { DataStatusControls } from './components/common/DataStatusControls';
import { LegacyMigrationDialog } from './components/common/LegacyMigrationDialog';
import { useApp } from './contexts/AppContext';
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
  const { isLoading } = useApp();
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showPriceHelp, setShowPriceHelp] = useState(false);

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
              <DataStatusControls />
              <button type="button" className="shortcut-help-button" onClick={() => setShowPriceHelp(true)}
                title="查看费用计算" aria-label="查看费用计算">🧮</button>
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
            {isLoading && <div className="empty-state">正在读取数据文件...</div>}
            {!isLoading && activeTab === 'items' && <ItemList />}
            {!isLoading && activeTab === 'tags' && <TagList />}
            {!isLoading && activeTab === 'recipes' && <RecipeList />}
            {!isLoading && activeTab === 'tree' && <RecipeTree />}
          </main>

          <GlobalNavigationHandler shortcutsDisabled={showShortcutHelp || showPriceHelp} />
          <UrlItemImporter />
          {showShortcutHelp && <ShortcutHelpDialog onClose={() => setShowShortcutHelp(false)} />}
          {showPriceHelp && <PriceHelpDialog onClose={() => setShowPriceHelp(false)} />}
          <LegacyMigrationDialog />
        </div>
  );
}

export default App;
