import { AppData, ProcessingFee, Recipe } from '../types';

export const WORKSTATION_TAG_NAME = '工作方块';
export const PROCESSING_FEE_EXAMPLE = {
  inputTotal: 20,
  fixedFee: 1,
  ratePercent: 5,
  cap: 3,
  outputCount: 4
} as const;

export interface ResolvedProcessingFee {
  fixedFee: number;
  rate: number;
  cap?: number;
  isValidWorkstation: boolean;
}

export function isWorkstationItem(data: AppData, itemId: string): boolean {
  const item = data.items[itemId];
  if (!item) return false;
  return item.tags.some(tagId => data.tags[tagId]?.name.trim() === WORKSTATION_TAG_NAME);
}

function nonNegative(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function resolveProcessingFee(data: AppData, recipe: Recipe): ResolvedProcessingFee {
  const workstation = data.items[recipe.workstation];
  const valid = Boolean(workstation) && isWorkstationItem(data, recipe.workstation);
  if (!valid) return { fixedFee: 0, rate: 0, isValidWorkstation: false };

  const defaults: ProcessingFee = workstation.processingFee || {};
  const override = recipe.processingFeeOverride;
  const capMode = override?.capMode || 'inherit';
  const inheritedCap = nonNegative(defaults.cap);
  const cap = capMode === 'unlimited'
    ? undefined
    : capMode === 'value'
      ? nonNegative(override?.cap)
      : inheritedCap;

  return {
    fixedFee: nonNegative(override?.fixedFee) ?? nonNegative(defaults.fixedFee) ?? 0,
    rate: nonNegative(override?.rate) ?? nonNegative(defaults.rate) ?? 0,
    cap,
    isValidWorkstation: true
  };
}

export function calculateProcessingFee(inputTotal: number, config: ResolvedProcessingFee): number {
  const raw = Math.max(0, config.fixedFee + inputTotal * config.rate);
  return config.cap === undefined ? raw : Math.min(raw, config.cap);
}

export function reverseInputTotal(outputTotal: number, config: ResolvedProcessingFee): number {
  const total = Math.max(0, outputTotal);
  if (config.cap === undefined) {
    return Math.max(0, (total - config.fixedFee) / (1 + config.rate));
  }

  const uncapped = Math.max(0, (total - config.fixedFee) / (1 + config.rate));
  const rawFeeAtCandidate = config.fixedFee + uncapped * config.rate;
  if (rawFeeAtCandidate <= config.cap + Number.EPSILON) return uncapped;
  return Math.max(0, total - config.cap);
}
