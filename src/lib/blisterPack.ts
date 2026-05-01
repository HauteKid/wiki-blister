import type { CardRarity, WikiCard } from "../types";
import { normalizeCardCategory } from "./cardCategory";
import { normalizeRarity, rarityTier } from "./rarity";

/** Сколько карточек в одном дневном паке. */
export const BLISTER_CARD_COUNT = 7;

/**
 * Сколько валидных кандидатов собрать из топа до отбора пака.
 * Больше кандидатов → проще набрать разные тематики (категории).
 */
export const BLISTER_CANDIDATE_TARGET = 16;

/** Сколько «якорных» слотов резервируем под самые просматриваемые статьи дня (лучший ранг). */
export const BLISTER_ANCHOR_TOP = 2;

/**
 * Веса выпадения в пуле (ТЗ): редкие ступени попадают в пак реже, даже при высокой intrinsic.
 */
export const DROP_WEIGHTS: Record<CardRarity, number> = {
  common: 1000,
  rare: 300,
  epic: 80,
  legendary: 20,
  mythic: 5,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function intrinsicTier(c: WikiCard): CardRarity {
  return normalizeRarity(c.intrinsicRarity ?? c.rarity);
}

function pickWeightedIndex(weights: number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** Вес слота: вес редкости × приоритет ранга топа (лучший ранг — заметно выше). */
function slotWeight(c: WikiCard, rankByPageId: Map<number, number>): number {
  const rank = rankByPageId.get(c.pageid) ?? 999_999;
  const dw = DROP_WEIGHTS[intrinsicTier(c)];
  const rankBoost = 1 / Math.sqrt(rank);
  return dw * rankBoost;
}

function pickWeightedWithoutReplacement(candidates: WikiCard[], rankByPageId: Map<number, number>, n: number): WikiCard[] {
  const pool = [...candidates];
  const out: WikiCard[] = [];
  for (let k = 0; k < n && pool.length > 0; k++) {
    const w = pool.map((c) => slotWeight(c, rankByPageId));
    const idx = pickWeightedIndex(w);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

/**
 * Собирает пак из кандидатов (ТЗ: веса выпадения + ранг как мягкий приоритет):
 * 1) якоря — взвешенный выбор среди лучших по рангу;
 * 2) по одной карточке из каждой категории (разнообразие);
 * 3) добор взвешенно до BLISTER_CARD_COUNT.
 */
export function selectBlisterPack(
  candidates: WikiCard[],
  rankByPageId: Map<number, number>,
  size: number = BLISTER_CARD_COUNT,
): WikiCard[] {
  if (candidates.length < size) {
    throw new Error(`blister: нужно минимум ${size} кандидатов`);
  }

  const rankOf = (c: WikiCard) => rankByPageId.get(c.pageid) ?? 999_999;
  const sorted = [...candidates].sort((a, b) => rankOf(a) - rankOf(b));

  const out: WikiCard[] = [];
  const used = new Set<number>();
  const anchorSlots = Math.min(BLISTER_ANCHOR_TOP, size);

  const topBand = sorted.slice(0, Math.min(sorted.length, Math.max(anchorSlots * 4, 8)));
  for (let a = 0; a < anchorSlots && topBand.length > 0; a++) {
    const pool = topBand.filter((c) => !used.has(c.pageid));
    if (pool.length === 0) break;
    const w = pool.map((c) => slotWeight(c, rankByPageId));
    const idx = pickWeightedIndex(w);
    const pick = pool[idx]!;
    out.push(pick);
    used.add(pick.pageid);
  }

  const rest = sorted.filter((c) => !used.has(c.pageid));
  const byCat = new Map<string, WikiCard[]>();
  for (const c of rest) {
    const k = normalizeCardCategory(c.category);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(c);
  }
  for (const list of byCat.values()) {
    list.sort((a, b) => rankOf(a) - rankOf(b));
  }

  const catOrder = [...byCat.keys()].sort((a, b) => {
    const bestA = Math.min(...byCat.get(a)!.map(rankOf));
    const bestB = Math.min(...byCat.get(b)!.map(rankOf));
    return bestA - bestB;
  });

  for (const cat of catOrder) {
    if (out.length >= size) break;
    const list = byCat.get(cat)!.filter((c) => !used.has(c.pageid));
    if (list.length === 0) continue;
    const w = list.map((c) => slotWeight(c, rankByPageId));
    const idx = pickWeightedIndex(w);
    const pick = list[idx]!;
    out.push(pick);
    used.add(pick.pageid);
  }

  const remaining = sorted.filter((c) => !used.has(c.pageid));
  const need = size - out.length;
  if (need > 0) {
    out.push(...pickWeightedWithoutReplacement(remaining, rankByPageId, need));
  }

  return out.slice(0, size);
}

/**
 * Один слот — карточка с intrinsic ≥ «Редкая»; остальное — {@link selectBlisterPack}.
 */
export function selectBlisterPackWithMandatoryNaturalRare(
  candidates: WikiCard[],
  rankByPageId: Map<number, number>,
): WikiCard[] {
  const naturalRarePlus = candidates.filter(
    (c) => rarityTier(intrinsicTier(c)) >= rarityTier("rare"),
  );
  if (naturalRarePlus.length === 0) {
    throw new Error("blister: нет кандидата с естественной редкостью не ниже «Редкая»");
  }
  const w = naturalRarePlus.map((c) => slotWeight(c, rankByPageId));
  const idx = pickWeightedIndex(w);
  const mandatory = naturalRarePlus[idx]!;
  const rest = candidates.filter((c) => c.pageid !== mandatory.pageid);
  if (rest.length < BLISTER_CARD_COUNT - 1) {
    throw new Error("blister: недостаточно кандидатов после резерва под гарантированную редкую");
  }
  const restPack = selectBlisterPack(rest, rankByPageId, BLISTER_CARD_COUNT - 1);
  return shuffleBlisterDisplayOrder([mandatory, ...restPack]);
}

/** Случайный порядок карточек в паке (визуально свежее, не привязано к рангу). */
export function shuffleBlisterDisplayOrder(cards: WikiCard[]): WikiCard[] {
  return shuffle(cards);
}
