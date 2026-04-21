import type { TodaysPack, WikiCard } from "../types";

const KEY_COLLECTION = "wiki-blister:collection:v1";
const KEY_TODAY = "wiki-blister:todaysPack:v1";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadCollection(): WikiCard[] {
  return loadJson<WikiCard[]>(KEY_COLLECTION, []);
}

export function saveCollection(cards: WikiCard[]): void {
  localStorage.setItem(KEY_COLLECTION, JSON.stringify(cards));
}

export function loadTodaysPack(): TodaysPack | null {
  return loadJson<TodaysPack | null>(KEY_TODAY, null);
}

export function saveTodaysPack(pack: TodaysPack | null): void {
  if (pack == null) localStorage.removeItem(KEY_TODAY);
  else localStorage.setItem(KEY_TODAY, JSON.stringify(pack));
}

/** Сброс «сегодняшнего пакета», если календарный день в Моске сменился — вчерашний блистер «пропал». */
export function reconcileTodaysPackWithMskDate(mskToday: string): TodaysPack | null {
  const pack = loadTodaysPack();
  if (!pack) return null;
  if (pack.mskDate !== mskToday) {
    saveTodaysPack(null);
    return null;
  }
  return pack;
}

export function mergeIntoCollection(
  existing: WikiCard[],
  incoming: WikiCard[],
): WikiCard[] {
  const byId = new Map<number, WikiCard>();
  for (const c of existing) byId.set(c.pageid, c);
  for (const c of incoming) byId.set(c.pageid, c);
  return [...byId.values()].sort((a, b) => b.openedMskDate.localeCompare(a.openedMskDate) || a.title.localeCompare(b.title));
}
