import type { WikiCard } from "../types";
import { maxRarity, normalizeRarity, normalizeWikiCard } from "./rarity";

export function mergeIntoCollection(existing: WikiCard[], incoming: WikiCard[]): WikiCard[] {
  const byId = new Map<number, WikiCard>();
  for (const c of existing) {
    byId.set(c.pageid, normalizeWikiCard(c));
  }
  for (const c of incoming) {
    const inc = normalizeWikiCard(c);
    const prev = byId.get(c.pageid);
    if (prev) {
      const opened = prev.openedMskDate > inc.openedMskDate ? prev.openedMskDate : inc.openedMskDate;
      byId.set(c.pageid, {
        ...inc,
        rarity: maxRarity(normalizeRarity(prev.rarity), normalizeRarity(inc.rarity)),
        intrinsicRarity: maxRarity(
          normalizeRarity(prev.intrinsicRarity ?? prev.rarity),
          normalizeRarity(inc.intrinsicRarity ?? inc.rarity),
        ),
        openedMskDate: opened,
        category: inc.category ?? prev.category,
        otherSubcategory: inc.otherSubcategory ?? prev.otherSubcategory,
        pageQuality: inc.pageQuality ?? prev.pageQuality,
        favorite: inc.favorite !== undefined ? Boolean(inc.favorite) : Boolean(prev.favorite),
      });
    } else {
      byId.set(c.pageid, inc);
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.openedMskDate.localeCompare(a.openedMskDate) || a.title.localeCompare(b.title),
  );
}
