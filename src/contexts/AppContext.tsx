import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData } from '../types';
import { DataStore } from '../data/store';

interface AppContextType {
  data: AppData;
  setData: (data: AppData | ((prev: AppData) => AppData)) => void;
  showItemIds: boolean;
  setShowItemIds: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => DataStore.load());
  const [showItemIds, setShowItemIds] = useState(false);

  // 自动保存
  useEffect(() => {
    DataStore.save(data);
  }, [data]);

  return (
    <AppContext.Provider value={{ data, setData, showItemIds, setShowItemIds }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
