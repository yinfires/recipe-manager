export interface Item {
  id: string;          // 物品内部 ID（key）
  name: string;        // 显示名称
  itemId: string;      // Minecraft ID
  tags: string[];      // 所属标签 ID 列表
  createdAt?: string;  // 创建时间（ISO 8601）；旧数据加载时补齐
  manualPrice?: number; // 手动覆盖单价
  autoPrice?: number;   // 自动计算单价
  processingFee?: ProcessingFee;
}

export interface ProcessingFee {
  fixedFee?: number;
  rate?: number;
  cap?: number;
}

export interface ProcessingFeeOverride {
  fixedFee?: number;
  rate?: number;
  capMode?: 'inherit' | 'unlimited' | 'value';
  cap?: number;
}

export interface Tag {
  id: string;          // 标签内部 ID
  name: string;        // 标签名称
  items: string[];     // 直接包含的物品 ID
  childTags: string[]; // 子标签 ID
  parentTags: string[]; // 父标签 ID（用于同步）
}

export interface RecipeSlot {
  type: 'item' | 'tag';
  ref: string;         // 物品/标签 ID
  count: number;
}

export interface Recipe {
  id: string;          // 配方内部 ID
  name: string;        // 配方名称
  workstation: string; // 工作方块 ID（物品ID）
  inputs: RecipeSlot[];
  attachments: RecipeSlot[];
  outputs: RecipeSlot[];
  processingFeeOverride?: ProcessingFeeOverride;
}

export interface AppData {
  items: Record<string, Item>;
  tags: Record<string, Tag>;
  recipes: Record<string, Recipe>;
  unlockPlan: UnlockPlan;
}

export interface UnlockStage {
  id: string;
  name: string;
}

export interface UnlockPlan {
  stages: UnlockStage[];
  itemStages: Record<string, string>;
}

export interface PersistedData {
  schemaVersion: number;
  updatedAt: string;
  data: AppData;
}

export type ViewMode = 'source' | 'usage'; // 查看获取 | 查看制作
