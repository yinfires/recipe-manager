import { AppData, Item, RecipeSlot } from '../types';
import { calculateProcessingFee, resolveProcessingFee, reverseInputTotal } from './processingFees';

const PRICE_FACTOR = 10;

export function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * PRICE_FACTOR) / PRICE_FACTOR;
}

export function getEffectivePrice(item: Item | undefined): number | undefined {
  if (!item) return undefined;
  return item.manualPrice ?? item.autoPrice;
}

function normalizeManualPrice(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  return roundPrice(value);
}

function cloneWithoutAutoPrices(data: AppData): AppData {
  const items = Object.fromEntries(
    Object.entries(data.items || {}).map(([id, item]) => {
      const manualPrice = normalizeManualPrice(item.manualPrice);
      const normalized: Item = {
        ...item,
        tags: item.tags || []
      };

      delete normalized.autoPrice;
      if (manualPrice === undefined) {
        delete normalized.manualPrice;
      } else {
        normalized.manualPrice = manualPrice;
      }

      return [id, normalized];
    })
  );

  return {
    items,
    tags: data.tags || {},
    recipes: data.recipes || {}
  };
}

function getTagPrice(data: AppData, tagId: string): number | undefined {
  const tag = data.tags[tagId];
  if (!tag) return undefined;

  let lowest: number | undefined;
  tag.items.forEach(itemId => {
    const price = getEffectivePrice(data.items[itemId]);
    if (price !== undefined && (lowest === undefined || price < lowest)) {
      lowest = price;
    }
  });
  return lowest;
}

function getSlotPrice(data: AppData, slot: RecipeSlot): number | undefined {
  return slot.type === 'item'
    ? getEffectivePrice(data.items[slot.ref])
    : getTagPrice(data, slot.ref);
}

function aggregateItemSlots(slots: RecipeSlot[]): Map<string, number> {
  const result = new Map<string, number>();
  slots.forEach(slot => {
    if (slot.type !== 'item' || slot.count <= 0) return;
    result.set(slot.ref, (result.get(slot.ref) || 0) + slot.count);
  });
  return result;
}

function addCandidate(candidates: Map<string, number[]>, itemId: string, value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  const values = candidates.get(itemId) || [];
  values.push(roundPrice(value));
  candidates.set(itemId, values);
}

function collectForwardCandidates(data: AppData, candidates: Map<string, number[]>) {
  Object.values(data.recipes).forEach(recipe => {
    let inputTotal = 0;
    let hasKnownInputPrice = false;

    [...recipe.inputs, ...recipe.attachments].forEach(slot => {
      if (slot.count <= 0) return;
      const price = getSlotPrice(data, slot);
      if (price === undefined) return;
      hasKnownInputPrice = true;
      inputTotal += price * slot.count;
    });

    const outputs = aggregateItemSlots(recipe.outputs);
    if (!hasKnownInputPrice || outputs.size === 0) return;

    const distributableTotal = inputTotal + calculateProcessingFee(inputTotal, resolveProcessingFee(data, recipe));

    const outputKinds = [...outputs.entries()];
    const baseShare = distributableTotal / outputKinds.length;
    const outputsWithoutManualPrice = outputKinds.filter(([itemId]) => data.items[itemId]?.manualPrice === undefined);
    const manualOutputTotal = outputKinds.reduce((total, [itemId, count]) => {
      const manualPrice = data.items[itemId]?.manualPrice;
      return manualPrice === undefined ? total : total + manualPrice * count;
    }, 0);
    const remainingTotal = Math.max(0, distributableTotal - manualOutputTotal);

    outputKinds.forEach(([itemId, count]) => {
      const item = data.items[itemId];
      if (!item) return;

      if (outputKinds.length === 1 || item.manualPrice !== undefined) {
        addCandidate(candidates, itemId, baseShare / count);
        return;
      }

      if (outputsWithoutManualPrice.length > 0) {
        addCandidate(candidates, itemId, remainingTotal / outputsWithoutManualPrice.length / count);
      }
    });
  });
}

function collectReverseCandidates(data: AppData, candidates: Map<string, number[]>) {
  Object.values(data.recipes).forEach(recipe => {
    const inputItems = aggregateItemSlots(recipe.inputs);
    const containsNonItemInput = recipe.inputs.some(slot => slot.type !== 'item');
    const outputItems = aggregateItemSlots(recipe.outputs);

    if (containsNonItemInput || inputItems.size !== 1 || outputItems.size <= 1) return;

    const [[inputItemId, inputCount]] = [...inputItems.entries()];
    const inputItem = data.items[inputItemId];
    if (!inputItem || inputItem.manualPrice !== undefined) return;

    let outputTotal = 0;
    let hasKnownOutputPrice = false;
    outputItems.forEach((count, itemId) => {
      const price = getEffectivePrice(data.items[itemId]);
      if (price === undefined) return;
      hasKnownOutputPrice = true;
      outputTotal += price * count;
    });

    let knownAttachmentTotal = 0;
    let hasUnknownAttachment = false;
    recipe.attachments.forEach(slot => {
      if (slot.count <= 0) return;
      const price = getSlotPrice(data, slot);
      if (price === undefined) {
        hasUnknownAttachment = true;
      } else {
        knownAttachmentTotal += price * slot.count;
      }
    });

    if (hasKnownOutputPrice && !hasUnknownAttachment) {
      const totalBeforeProcessing = reverseInputTotal(outputTotal, resolveProcessingFee(data, recipe));
      const inputItemTotal = Math.max(0, totalBeforeProcessing - knownAttachmentTotal);
      addCandidate(candidates, inputItemId, inputItemTotal / inputCount);
    }
  });
}

function priceSignature(data: AppData): string {
  return Object.keys(data.items)
    .sort()
    .map(itemId => `${itemId}:${data.items[itemId].autoPrice ?? ''}`)
    .join('|');
}

export function recalculatePrices(data: AppData): AppData {
  let current = cloneWithoutAutoPrices(data);
  const seenStates = new Set<string>([priceSignature(current)]);
  const maxIterations = Math.max(32, Math.min(256, Object.keys(current.items).length * 4 + Object.keys(current.recipes).length * 4));

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const candidates = new Map<string, number[]>();
    collectForwardCandidates(current, candidates);
    collectReverseCandidates(current, candidates);

    const nextItems = Object.fromEntries(
      Object.entries(current.items).map(([itemId, item]) => {
        const nextItem = { ...item };
        const values = candidates.get(itemId);
        if (values && values.length > 0) {
          nextItem.autoPrice = Math.min(...values);
        } else {
          delete nextItem.autoPrice;
        }
        return [itemId, nextItem];
      })
    );
    const next = { ...current, items: nextItems };
    const signature = priceSignature(next);
    const currentSignature = priceSignature(current);

    if (signature === currentSignature) return next;
    if (seenStates.has(signature)) return next;

    seenStates.add(signature);
    current = next;
  }

  return current;
}
