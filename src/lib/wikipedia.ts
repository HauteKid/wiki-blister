import type { WikiCard } from "../types";
import { applyNonCommonGuarantee, normalizeRarity, rarityFromPopularity } from "./rarity";

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
      if (pool.length >= 20) return pool;
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
};

async function fetchSummary(title: string): Promise<WikiCard | null> {
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${RU_WIKI}/api/rest_v1/page/summary/${path}`);
  if (!res.ok) return null;
  const s = (await res.json()) as SummaryOk;
  if (s.type === "disambiguation" || s.type === "not_found") return null;
  const url = s.content_urls?.desktop?.page ?? `${RU_WIKI}/wiki/${path}`;
  const extract = (s.extract ?? "").trim();
  if (!extract || !s.pageid) return null;
  return {
    pageid: s.pageid,
    title: s.title,
    extract,
    thumbnailUrl: s.thumbnail?.source ?? null,
    articleUrl: url,
    openedMskDate: "",
    rarity: "common",
  };
}

export async function drawFiveCards(mskDate: string): Promise<WikiCard[]> {
  const pool = await fetchPopularArticlePool();
  const shuffled = shuffle(pool);
  const picked: WikiCard[] = [];
  const tried = new Set<string>();
  const rankByPageId = new Map<number, number>();

  for (const entry of shuffled) {
    if (picked.length >= 5) break;
    if (tried.has(entry.title)) continue;
    tried.add(entry.title);
    const card = await fetchSummary(entry.title);
    if (card) {
      card.openedMskDate = mskDate;
      card.rarity = rarityFromPopularity(entry.rank, entry.views);
      rankByPageId.set(card.pageid, entry.rank);
      picked.push(card);
    }
    if (tried.size > 80 && picked.length < 5) break;
  }

  if (picked.length < 5) {
    throw new Error("Не хватило подходящих статей для полного блистера. Попробуйте ещё раз.");
  }

  applyNonCommonGuarantee(picked, rankByPageId);
  for (const c of picked) {
    c.rarity = normalizeRarity(c.rarity);
  }

  return picked;
}
