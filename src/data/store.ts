import { AppData } from '../types';

const STORAGE_KEY = 'recipe_manager_data';

export const DataStore = {
  load(): AppData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : this.getDefault();
    } catch {
      return this.getDefault();
    }
  },

  save(data: AppData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getDefault(): AppData {
    return {
      items: {},
      tags: {},
      recipes: {}
    };
  }
};
