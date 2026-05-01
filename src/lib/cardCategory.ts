import type { CardCategory, WikiCard } from "../types";

/** Порядок правил: первое совпадение по любому из P31 объекта. */
const RULES: { category: CardCategory; qids: readonly string[] }[] = [
  {
    category: "person",
    qids: [
      "Q5", // human
      "Q15632617", // fictional human
    ],
  },
  {
    category: "country",
    qids: [
      "Q6256", // country
      "Q3624078", // sovereign state
      "Q7275", // state
      "Q11209920", // historical country
      "Q3024240", // former country
    ],
  },
  {
    category: "place",
    qids: [
      "Q515", // city
      "Q3957", // town
      "Q1549591", // big city / metropolis
      "Q486972", // human settlement
      "Q532", // village
      "Q7930989", // city district
      "Q16334295", // megacity
      "Q35657", // river
      "Q8502", // mountain
      "Q44594", // geographic region
      "Q23397", // lake
    ],
  },
  {
    category: "event",
    qids: [
      "Q1190554", // event
      "Q1656682", // period
      "Q40231", // world war
      "Q198", // war
      "Q103495", // war (dup family)
      "Q15981195", // battle
      "Q1656681", // historical event
      "Q159813", // Olympic Games
    ],
  },
  {
    category: "culture",
    qids: [
      "Q11424", // film
      "Q5398426", // TV series
      "Q7725634", // literary work
      "Q7889", // video game
      "Q3305213", // painting
      "Q7366", // song
      "Q482994", // album
    ],
  },
  {
    category: "science",
    qids: [
      "Q11344", // chemical element
      "Q11173", // chemical compound
      "Q16521", // taxon
      "Q8138", // mineral
      "Q11053", // RNA / биомолекулы — часто подтипы
    ],
  },
  {
    category: "org",
    qids: [
      "Q43229", // organization
      "Q783794", // company
      "Q891723", // public company
      "Q245065", // international organization
      "Q4830453", // business
    ],
  },
];

/** Приоритет: первое правило из RULES, у которого есть пересечение с P31. */
export function categoryFromP31Qids(p31Qids: string[]): CardCategory {
  const set = new Set(p31Qids);
  for (const { category, qids } of RULES) {
    if (qids.some((q) => set.has(q))) return category;
  }
  return "other";
}

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  person: "Личность",
  country: "Страна",
  place: "Место",
  event: "Событие",
  culture: "Культура",
  science: "Наука",
  org: "Организация",
  other: "Разное",
};

export function normalizeCardCategory(x: unknown): CardCategory {
  if (
    x === "person" ||
    x === "country" ||
    x === "place" ||
    x === "event" ||
    x === "culture" ||
    x === "science" ||
    x === "org" ||
    x === "other"
  ) {
    return x;
  }
  return "other";
}

type WbEntity = {
  missing?: string;
  claims?: {
    P31?: Array<{
      mainsnak?: {
        snaktype?: string;
        datavalue?: {
          value?: { id?: string; "numeric-id"?: number; "entity-type"?: string };
        };
      };
    }>;
  };
  sitelinks?: Record<string, unknown>;
};

function extractSitelinkCount(entity: WbEntity | undefined): number {
  const sl = entity?.sitelinks;
  if (!sl || typeof sl !== "object") return 0;
  return Object.keys(sl).length;
}

function extractP31FromEntity(entity: WbEntity | undefined): string[] {
  if (!entity?.claims?.P31) return [];
  const out: string[] = [];
  for (const claim of entity.claims.P31) {
    const ms = claim.mainsnak;
    if (!ms || ms.snaktype !== "value") continue;
    const v = ms.datavalue?.value;
    if (!v || typeof v !== "object") continue;
    if (typeof v.id === "string") out.push(v.id);
    else if (typeof v["numeric-id"] === "number") out.push(`Q${v["numeric-id"]}`);
  }
  return out;
}

const RU_WIKI_API = "https://ru.wikipedia.org/w/api.php";

/** Связь pageid русской Википедии → Q-id (для карточек без сохранённой категории). */
export async function fetchWikibaseIdsByRuPageIds(pageIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const unique = [...new Set(pageIds)];
  for (let i = 0; i < unique.length; i += 48) {
    const chunk = unique.slice(i, i + 48);
    const url =
      `${RU_WIKI_API}?action=query&format=json&origin=*&prop=pageprops&ppprop=wikibase_item` +
      `&pageids=${chunk.join("|")}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            { pageid?: number; missing?: string; pageprops?: { wikibase_item?: string } }
          >;
        };
      };
      const pages = data.query?.pages ?? {};
      for (const p of Object.values(pages)) {
        if (!p || typeof p !== "object") continue;
        if ("missing" in p) continue;
        if (typeof p.pageid !== "number") continue;
        const wb = p.pageprops?.wikibase_item?.trim();
        if (wb) map.set(p.pageid, wb);
      }
    } catch {
      /* сеть */
    }
  }
  return map;
}

/** Для карточек без поля category: Wikidata P31 → категория; результат можно сохранить в БД. */
export async function enrichWikiCardsCategoriesMissing(
  cards: WikiCard[],
): Promise<{ next: WikiCard[]; patched: boolean }> {
  const needsIdx = cards.map((c, i) => (c.category == null ? i : -1)).filter((i) => i >= 0);
  if (needsIdx.length === 0) return { next: cards, patched: false };

  const pageIds = [...new Set(needsIdx.map((i) => cards[i]!.pageid))];
  const wbByPage = await fetchWikibaseIdsByRuPageIds(pageIds);
  const wbIds = [...new Set([...wbByPage.values()])];
  const p31Map = await fetchP31ByWikibaseIds(wbIds);

  const next: WikiCard[] = cards.map((c) => {
    if (c.category != null) return c;
    const wb = wbByPage.get(c.pageid);
    if (!wb) return { ...c, category: "other" };
    const p31 = p31Map.get(wb) ?? [];
    return { ...c, category: categoryFromP31Qids(p31) };
  });
  return { next, patched: true };
}

export type WikidataBlisterMeta = { p31: string[]; sitelinks: number };

/** P31 + число интервики за один запрос (редкость и категория в блистере). */
export async function fetchWikidataBlisterMetadata(ids: string[]): Promise<Map<string, WikidataBlisterMeta>> {
  const result = new Map<string, WikidataBlisterMeta>();
  if (ids.length === 0) return result;

  const unique = [...new Set(ids.map((id) => (id.startsWith("Q") ? id : `Q${id}`)))];
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|sitelinks&format=json&origin=*` +
    `&ids=${encodeURIComponent(unique.join("|"))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return result;
    const data = (await res.json()) as { entities?: Record<string, WbEntity> };
    const entities = data.entities ?? {};
    for (const id of unique) {
      const ent = entities[id];
      if (!ent || ent.missing !== undefined) {
        result.set(id, { p31: [], sitelinks: 0 });
        continue;
      }
      result.set(id, {
        p31: extractP31FromEntity(ent),
        sitelinks: extractSitelinkCount(ent),
      });
    }
  } catch {
    /* сеть / CORS */
  }
  return result;
}

/** Один запрос wbgetentities на несколько Q-id (только P31 — для обогащения категории в коллекции). */
export async function fetchP31ByWikibaseIds(ids: string[]): Promise<Map<string, string[]>> {
  const full = await fetchWikidataBlisterMetadata(ids);
  const result = new Map<string, string[]>();
  for (const [id, v] of full) result.set(id, v.p31);
  return result;
}
