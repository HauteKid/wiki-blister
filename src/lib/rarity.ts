import type { CardRarity, WikiCard } from "../types";

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

/** Если все пять common — поднимаем до rare карту с лучшим (минимальным) рангом в топе. */
export function applyNonCommonGuarantee(cards: WikiCard[], rankByPageId: Map<number, number>): void {
  if (cards.length === 0) return;
  if (!cards.every((c) => normalizeRarity(c.rarity) === "common")) return;
  let best = cards[0];
  let bestRank = rankByPageId.get(best.pageid) ?? 999999;
  for (const c of cards) {
    const r = rankByPageId.get(c.pageid) ?? 999999;
    if (r < bestRank) {
      bestRank = r;
      best = c;
    }
  }
  best.rarity = "rare";
}

export function normalizeWikiCard(c: WikiCard): WikiCard {
  return { ...c, rarity: normalizeRarity(c.rarity) };
}
