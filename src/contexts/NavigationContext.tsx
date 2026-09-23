import { createContext, useContext, useState, ReactNode } from 'react';
import { Item, Tag, Recipe } from '../types';

interface NavigationContextType {
  selectedItem: Item | null;
  selectedTag: Tag | null;
  selectedRecipe: Recipe | null;
  recipeTreeTarget: { id: string; type: 'item' | 'tag' } | null;
  setSelectedItem: (item: Item | null) => void;
  setSelectedTag: (tag: Tag | null) => void;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  setRecipeTreeTarget: (target: { id: string; type: 'item' | 'tag' } | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeTreeTarget, setRecipeTreeTarget] = useState<{ id: string; type: 'item' | 'tag' } | null>(null);

  return (
    <NavigationContext.Provider
      value={{
        selectedItem,
        selectedTag,
        selectedRecipe,
        recipeTreeTarget,
        setSelectedItem,
        setSelectedTag,
        setSelectedRecipe,
        setRecipeTreeTarget
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
