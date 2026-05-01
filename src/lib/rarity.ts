import type { CardCategory, CardRarity, WikiCard } from "../types";
import { normalizeCardCategory } from "./cardCategory";

const ORDER: CardRarity[] = ["common", "rare", "epic", "legendary", "mythic"];

export const RARITY_LABEL: Record<CardRarity, string> = {
  common: "Обычная",
  rare: "Редкая",
  epic: "Эпическая",
  legendary: "Легендарная",
  mythic: "Мифическая",
};

export function rarityTier(r: CardRarity): number {
  return ORDER.indexOf(r);
}

export function maxRarity(a: CardRarity, b: CardRarity): CardRarity {
  return rarityTier(a) >= rarityTier(b) ? a : b;
}

export function normalizeRarity(x: unknown): CardRarity {
  if (x === "common" || x === "rare" || x === "epic" || x === "legendary" || x === "mythic") return x;
  return "common";
}

/** Редкость от популярности в дневном топе: ранг + порог просмотров (без цитирования — отдельный API). */
export function rarityFromPopularity(rank: number, views: number): CardRarity {
  if (rank <= 1) return "mythic";
  if (rank <= 3) return "legendary";
  if (rank <= 8) return "epic";
  if (rank <= 20) return "rare";
  if (views >= 400_000) return "epic";
  if (views >= 150_000) return "rare";
  return "common";
}

/** Минимальное число sitelinks для каждой ступени редкости внутри категории карточки. */
type SitelinkThresholds = { mythic: number; legendary: number; epic: number; rare: number };

/**
 * Отдельные шкалы: у стран и городов интервики обычно больше, чем у людей или организаций той же «известности».
 */
const SITELINKS_BY_CATEGORY: Record<CardCategory, SitelinkThresholds> = {
  country: { mythic: 235, legendary: 168, epic: 102, rare: 46 },
  place: { mythic: 198, legendary: 142, epic: 86, rare: 40 },
  person: { mythic: 168, legendary: 120, epic: 74, rare: 34 },
  culture: { mythic: 162, legendary: 116, epic: 70, rare: 30 },
  science: { mythic: 172, legendary: 124, epic: 76, rare: 38 },
  event: { mythic: 158, legendary: 112, epic: 66, rare: 28 },
  org: { mythic: 152, legendary: 108, epic: 64, rare: 26 },
  other: { mythic: 190, legendary: 130, epic: 82, rare: 36 },
};

export function rarityFromSitelinksForCategory(category: CardCategory, sitelinkCount: number): CardRarity {
  const cat = normalizeCardCategory(category);
  const t = SITELINKS_BY_CATEGORY[cat];
  const n = Math.max(0, sitelinkCount);
  if (n >= t.mythic) return "mythic";
  if (n >= t.legendary) return "legendary";
  if (n >= t.epic) return "epic";
  if (n >= t.rare) return "rare";
  return "common";
}

/**
 * При наличии Wikidata: sitelinks + категория (P31). Без элемента WD — только топ дня.
 */
export function rarityFromNotability(
  category: CardCategory,
  sitelinkCount: number | undefined,
  rank: number,
  views: number,
  hasWikibase: boolean,
): CardRarity {
  if (hasWikibase && sitelinkCount !== undefined) {
    return rarityFromSitelinksForCategory(category, sitelinkCount);
  }
  return rarityFromPopularity(rank, views);
}

/** Редкость нормализуем всегда; категорию — только если уже есть в JSON (старые карточки без поля догружаем отдельно). */
export function normalizeWikiCard(c: WikiCard): WikiCard {
  const rarity = normalizeRarity(c.rarity);
  const { category, ...rest } = c;
  if (category == null) return { ...rest, rarity };
  return { ...rest, rarity, category: normalizeCardCategory(category) };
}
