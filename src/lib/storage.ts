import type { WikiCard } from "../types";
import { maxRarity, normalizeRarity } from "./rarity";

export function mergeIntoCollection(existing: WikiCard[], incoming: WikiCard[]): WikiCard[] {
  const byId = new Map<number, WikiCard>();
  for (const c of existing) {
    byId.set(c.pageid, { ...c, rarity: normalizeRarity(c.rarity) });
  }
  for (const c of incoming) {
    const inc = { ...c, rarity: normalizeRarity(c.rarity) };
    const prev = byId.get(c.pageid);
    if (prev) {
      const opened = prev.openedMskDate > inc.openedMskDate ? prev.openedMskDate : inc.openedMskDate;
      byId.set(c.pageid, {
        ...inc,
        rarity: maxRarity(normalizeRarity(prev.rarity), normalizeRarity(inc.rarity)),
        openedMskDate: opened,
      });
    } else {
      byId.set(c.pageid, inc);
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.openedMskDate.localeCompare(a.openedMskDate) || a.title.localeCompare(b.title),
  );
}
