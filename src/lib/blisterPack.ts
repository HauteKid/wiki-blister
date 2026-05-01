import type { WikiCard } from "../types";
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Собирает пак из кандидатов:
 * 1) якоря — лучшие по рангу (обычно дают заметную редкость);
 * 2) по одной лучшей карточке из каждой категории среди оставшихся (разнообразие коллекции);
 * 3) добор по рангу до BLISTER_CARD_COUNT.
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

  for (const c of sorted) {
    if (out.length >= anchorSlots || out.length >= size) break;
    if (!used.has(c.pageid)) {
      out.push(c);
      used.add(c.pageid);
    }
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
    const list = byCat.get(cat)!;
    const pick = list.find((c) => !used.has(c.pageid));
    if (pick) {
      out.push(pick);
      used.add(pick.pageid);
    }
  }

  for (const c of sorted) {
    if (out.length >= size) break;
    if (!used.has(c.pageid)) {
      out.push(c);
      used.add(c.pageid);
    }
  }

  return out.slice(0, size);
}

/**
 * Один слот в паке — карточка с редкостью ≥ «Редкая» по уже посчитанной шкале (sitelinks / топ без WD).
 * Остальные слоты — как в {@link selectBlisterPack}.
 */
export function selectBlisterPackWithMandatoryNaturalRare(
  candidates: WikiCard[],
  rankByPageId: Map<number, number>,
): WikiCard[] {
  const rankOf = (c: WikiCard) => rankByPageId.get(c.pageid) ?? 999_999;
  const naturalRarePlus = candidates.filter(
    (c) => rarityTier(normalizeRarity(c.rarity)) >= rarityTier("rare"),
  );
  if (naturalRarePlus.length === 0) {
    throw new Error("blister: нет кандидата с естественной редкостью не ниже «Редкая»");
  }
  naturalRarePlus.sort((a, b) => rankOf(a) - rankOf(b));
  const mandatory = naturalRarePlus[0]!;
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
