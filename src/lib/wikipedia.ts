import type { WikiCard } from "../types";
import {
  BLISTER_CANDIDATE_TARGET,
  BLISTER_CARD_COUNT,
  selectBlisterPackWithMandatoryNaturalRare,
} from "./blisterPack";
import { categoryFromP31Qids, fetchWikidataBlisterMetadata } from "./cardCategory";
import { normalizeRarity, rarityFromNotability, rarityTier } from "./rarity";

const RU_WIKI = "https://ru.wikipedia.org";
const PAGEVIEWS_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ru.wikipedia/all-access";

type TopArticle = { article: string; rank: number; views: number };

type TopResponse = {
  items?: Array<{
    articles?: TopArticle[];
  }>;
};

export type PopularArticle = {
  title: string;
  rank: number;
  views: number;
};

function decodeTitle(article: string): string {
  const underscored = article.replace(/_/g, " ");
  try {
    return decodeURIComponent(underscored);
  } catch {
    return underscored;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isLikelyBadTitle(article: string): boolean {
  const t = article;
  if (t === "Заглавная_страница") return true;
  if (t.includes(":")) return true;
  return false;
}

async function fetchPopularArticlesForDay(year: string, month: string, day: string): Promise<PopularArticle[]> {
  const url = `${PAGEVIEWS_BASE}/${year}/${month}/${day}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`top ${res.status}`);
  const data = (await res.json()) as TopResponse;
  const articles = data.items?.[0]?.articles ?? [];
  return articles
    .filter((a) => !isLikelyBadTitle(a.article))
    .map((a) => ({
      title: decodeTitle(a.article),
      rank: a.rank,
      views: a.views,
    }));
}

/** Топ просмотров за последний доступный день — с рангом и числом просмотров. */
export async function fetchPopularArticlePool(maxDaysBack = 14): Promise<PopularArticle[]> {
  const now = new Date();
  for (let back = 3; back <= maxDaysBack; back++) {
    const d = new Date(now.getTime() - back * 86400000);
    const y = String(d.getUTCFullYear());
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    try {
      const pool = await fetchPopularArticlesForDay(y, m, day);
      if (pool.length >= 28) return pool;
    } catch {
      /* пробуем предыдущий день */
    }
  }
  throw new Error("Не удалось загрузить список популярных статей. Попробуйте позже.");
}

type SummaryOk = {
  type: string;
  title: string;
  pageid: number;
  extract?: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page: string } };
  /** Q-id элемента Wikidata, если страница сматчена */
  wikibase_item?: string;
};

type CardWithWikibase = WikiCard & { _wikibaseItem?: string };

function packHasRareOrBetter(candidates: WikiCard[]): boolean {
  return candidates.some((c) => rarityTier(normalizeRarity(c.rarity)) >= rarityTier("rare"));
}

async function applyWikidataToCandidates(
  candidates: CardWithWikibase[],
  rankByPageId: Map<number, number>,
  viewsByPageId: Map<number, number>,
): Promise<void> {
  const wbIds = [...new Set(candidates.map((c) => c._wikibaseItem).filter(Boolean))] as string[];
  const meta = await fetchWikidataBlisterMetadata(wbIds);
  for (const c of candidates) {
    const wb = c._wikibaseItem;
    const rank = rankByPageId.get(c.pageid) ?? 999_999;
    const views = viewsByPageId.get(c.pageid) ?? 0;
    if (wb) {
      const m = meta.get(wb) ?? { p31: [], sitelinks: 0 };
      const cat = categoryFromP31Qids(m.p31);
      c.category = cat;
      c.rarity = rarityFromNotability(cat, m.sitelinks, rank, views, true);
    } else {
      c.category = "other";
      c.rarity = rarityFromNotability("other", undefined, rank, views, false);
    }
  }
}

async function fetchSummary(title: string): Promise<CardWithWikibase | null> {
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${RU_WIKI}/api/rest_v1/page/summary/${path}`);
  if (!res.ok) return null;
  const s = (await res.json()) as SummaryOk;
  if (s.type === "disambiguation" || s.type === "not_found") return null;
  const url = s.content_urls?.desktop?.page ?? `${RU_WIKI}/wiki/${path}`;
  const extract = (s.extract ?? "").trim();
  if (!extract || !s.pageid) return null;
  const item = s.wikibase_item?.trim();
  return {
    pageid: s.pageid,
    title: s.title,
    extract,
    thumbnailUrl: s.thumbnail?.source ?? null,
    articleUrl: url,
    openedMskDate: "",
    rarity: "common",
    ...(item ? { _wikibaseItem: item } : {}),
  };
}

const BLISTER_MAX_TRIES = 140;

/**
 * Дневной блистер: {@link BLISTER_CARD_COUNT} карточек.
 * Кандидаты из топа → Wikidata (категория + sitelinks для редкости) → отбор пака.
 */
export async function drawBlisterCards(mskDate: string): Promise<WikiCard[]> {
  const pool = await fetchPopularArticlePool();
  const shuffled = shuffle(pool);
  const candidates: CardWithWikibase[] = [];
  const tried = new Set<string>();
  const rankByPageId = new Map<number, number>();
  const viewsByPageId = new Map<number, number>();

  for (const entry of shuffled) {
    if (candidates.length >= BLISTER_CANDIDATE_TARGET) break;
    if (tried.has(entry.title)) continue;
    tried.add(entry.title);
    const card = await fetchSummary(entry.title);
    if (card) {
      card.openedMskDate = mskDate;
      rankByPageId.set(card.pageid, entry.rank);
      viewsByPageId.set(card.pageid, entry.views);
      candidates.push(card);
    }
    if (tried.size > BLISTER_MAX_TRIES && candidates.length >= BLISTER_CARD_COUNT) break;
  }

  await applyWikidataToCandidates(candidates, rankByPageId, viewsByPageId);

  if (!packHasRareOrBetter(candidates)) {
    const byRank = [...pool].sort((a, b) => a.rank - b.rank);
    let guard = 0;
    while (!packHasRareOrBetter(candidates) && guard < 80) {
      guard += 1;
      let progressed = false;
      for (const entry of byRank) {
        if (tried.has(entry.title)) continue;
        tried.add(entry.title);
        const card = await fetchSummary(entry.title);
        if (card) {
          card.openedMskDate = mskDate;
          rankByPageId.set(card.pageid, entry.rank);
          viewsByPageId.set(card.pageid, entry.views);
          candidates.push(card);
          await applyWikidataToCandidates(candidates, rankByPageId, viewsByPageId);
          progressed = true;
          break;
        }
      }
      if (!progressed) break;
    }
  }

  if (candidates.length < BLISTER_CARD_COUNT) {
    throw new Error("Не хватило подходящих статей для полного блистера. Попробуйте ещё раз.");
  }

  if (!packHasRareOrBetter(candidates)) {
    throw new Error(
      "Не удалось включить в пак статью с редкостью не ниже «Редкая». Попробуйте позже.",
    );
  }

  const picked = selectBlisterPackWithMandatoryNaturalRare(candidates, rankByPageId) as CardWithWikibase[];

  for (const c of picked) {
    delete c._wikibaseItem;
  }

  for (const c of picked) {
    c.rarity = normalizeRarity(c.rarity);
  }

  return picked;
}

/** @deprecated Используйте {@link drawBlisterCards}. */
export async function drawFiveCards(mskDate: string): Promise<WikiCard[]> {
  return drawBlisterCards(mskDate);
}
