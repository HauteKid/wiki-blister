import type { WikiCard } from "../types";

const RU_WIKI = "https://ru.wikipedia.org";
const PAGEVIEWS_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ru.wikipedia/all-access";

type TopArticle = { article: string; rank: number; views: number };

type TopResponse = {
  items?: Array<{
    articles?: TopArticle[];
  }>;
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

async function fetchTopTitlesForDay(year: string, month: string, day: string): Promise<string[]> {
  const url = `${PAGEVIEWS_BASE}/${year}/${month}/${day}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`top ${res.status}`);
  const data = (await res.json()) as TopResponse;
  const articles = data.items?.[0]?.articles ?? [];
  return articles
    .filter((a) => !isLikelyBadTitle(a.article))
    .map((a) => decodeTitle(a.article));
}

/** Берём топ просмотров за последний доступный день (данные обычно с задержкой 2–3 суток). */
export async function fetchPopularTitlePool(maxDaysBack = 14): Promise<string[]> {
  const now = new Date();
  for (let back = 3; back <= maxDaysBack; back++) {
    const d = new Date(now.getTime() - back * 86400000);
    const y = String(d.getUTCFullYear());
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    try {
      const titles = await fetchTopTitlesForDay(y, m, day);
      if (titles.length >= 20) return titles;
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
    openedMskDate: "", // заполняет вызывающий
  };
}

export async function drawFiveCards(mskDate: string): Promise<WikiCard[]> {
  const pool = await fetchPopularTitlePool();
  const shuffled = shuffle(pool);
  const picked: WikiCard[] = [];
  const tried = new Set<string>();

  for (const title of shuffled) {
    if (picked.length >= 5) break;
    if (tried.has(title)) continue;
    tried.add(title);
    const card = await fetchSummary(title);
    if (card) {
      card.openedMskDate = mskDate;
      picked.push(card);
    }
    if (tried.size > 80 && picked.length < 5) break;
  }

  if (picked.length < 5) {
    throw new Error("Не хватило подходящих статей для полного блистера. Попробуйте ещё раз.");
  }
  return picked;
}
