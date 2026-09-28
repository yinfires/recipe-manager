import { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { AppData } from '../types';
import { DataStore, SaveState } from '../data/store';
import { recalculatePrices } from '../utils/priceCalculator';

interface AppContextType {
  data: AppData;
  setData: (data: AppData | ((prev: AppData) => AppData)) => void;
  showItemIds: boolean;
  setShowItemIds: (show: boolean) => void;
  isEditable: boolean;
  isLoading: boolean;
  saveState: SaveState;
  saveNow: () => Promise<void>;
  downloadBackup: () => void;
  legacyData: AppData | null;
  migrateLegacyData: () => Promise<void>;
  keepFileData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setRawData] = useState<AppData>({ items: {}, tags: {}, recipes: {} });
  const [isEditable, setIsEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [legacyData, setLegacyData] = useState<AppData | null>(null);
  const [showItemIds, setShowItemIds] = useState(false);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    DataStore.load().then(({ persisted, editable }) => {
      if (cancelled) return;
      setRawData(recalculatePrices(persisted.data));
      setIsEditable(editable);
      setSaveState(editable ? 'saved' : 'readonly');
      if (editable && !DataStore.hasCompletedMigration()) {
        setLegacyData(DataStore.getLegacyData());
      }
      loadedRef.current = true;
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const setData = useCallback((update: AppData | ((prev: AppData) => AppData)) => {
    if (!isEditable) return;
    dirtyRef.current = true;
    setRawData(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      return recalculatePrices(next);
    });
  }, [isEditable]);

  const saveNow = useCallback(async () => {
    if (!isEditable || !loadedRef.current) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    try {
      await DataStore.save(data);
      dirtyRef.current = false;
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [data, isEditable]);

  useEffect(() => {
    if (!isEditable || !loadedRef.current || !dirtyRef.current) return;
    setSaveState('saving');
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => { void saveNow(); }, 600);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [data, isEditable, saveNow]);

  const migrateLegacyData = useCallback(async () => {
    if (!legacyData || !isEditable) return;
    DataStore.download(data, 'recipe-manager-file-before-migration.json');
    DataStore.download(legacyData, 'recipe-manager-browser-legacy.json');
    const migrated = recalculatePrices(legacyData);
    setRawData(migrated);
    setSaveState('saving');
    try {
      await DataStore.save(migrated);
      dirtyRef.current = false;
      DataStore.markMigrationComplete();
      setLegacyData(null);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [data, isEditable, legacyData]);

  const keepFileData = useCallback(() => {
    DataStore.download(data, 'recipe-manager-file-data.json');
    if (legacyData) DataStore.download(legacyData, 'recipe-manager-browser-legacy.json');
    DataStore.markMigrationComplete();
    setLegacyData(null);
  }, [data, legacyData]);

  return (
    <AppContext.Provider value={{
      data, setData, showItemIds, setShowItemIds, isEditable, isLoading, saveState,
      saveNow, downloadBackup: () => DataStore.download(data), legacyData,
      migrateLegacyData, keepFileData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
