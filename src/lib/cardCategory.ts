import type { CardCategory, CardOtherSubcategory, WikiCard, WikidataClaims } from "../types";

/** Порядок правил: первое совпадение по любому из P31 объекта. */
const RULES: { category: CardCategory; qids: readonly string[] }[] = [
  {
    category: "person",
    qids: [
      "Q5", // human
      "Q15632617", // fictional human
      "Q20643948", // human biblical figure
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
      "Q12547315", // ghost town
      "Q28133039", // city of regional significance (UA и др.)
      "Q18247357", // closed city / ЗАТО
      "Q7935096", // rural settlement
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
      "Q500834", // sports competition
      "Q16510064", // recurring sporting event
      "Q27968055", // edition of a recurring event (часто у ЧМ, Олимпиад)
    ],
  },
  {
    category: "culture",
    qids: [
      "Q11424", // film
      "Q5398426", // TV series
      "Q15416", // television program (часто у сериалов)
      "Q5817146", // streaming television series
      "Q3036181", // television series (альтернативный тип)
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
      "Q176799", // military unit
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

const OTHER_SUB_SPECIES: readonly string[] = ["Q16521", "Q7432", "Q729", "Q427175"];
const OTHER_SUB_TECH: readonly string[] = [
  "Q11016",
  "Q184588",
  "Q7397",
  "Q166142",
  "Q193424",
  "Q19967801",
];
const OTHER_SUB_ARTIFACT: readonly string[] = [
  "Q49843",
  "Q3941672",
  "Q847950",
  "Q4006",
  "Q728",
  "Q206706",
  "Q811979",
  "Q15243209",
];
const OTHER_SUB_CONCEPT: readonly string[] = ["Q151885", "Q60599247", "Q937228", "Q1969448"];

const OTHER_SUB_RULES: { sub: CardOtherSubcategory; qids: readonly string[] }[] = [
  { sub: "species", qids: OTHER_SUB_SPECIES },
  { sub: "technology", qids: OTHER_SUB_TECH },
  { sub: "artifact", qids: OTHER_SUB_ARTIFACT },
  { sub: "concept", qids: OTHER_SUB_CONCEPT },
];

/** Уточнение «Разное» по P31 (первое совпавшее правило). */
export function inferOtherSubcategory(p31Qids: string[]): CardOtherSubcategory {
  const set = new Set(p31Qids);
  for (const { sub, qids } of OTHER_SUB_RULES) {
    if (qids.some((q) => set.has(q))) return sub;
  }
  return "other";
}

export function normalizeCardOtherSubcategory(x: unknown): CardOtherSubcategory {
  if (x === "artifact" || x === "technology" || x === "species" || x === "concept" || x === "other") {
    return x;
  }
  return "other";
}

type WbSnak = {
  rank?: string;
  mainsnak?: {
    snaktype?: string;
    property?: string;
    datavalue?: { type?: string; value?: unknown };
  };
};

type WbEntity = {
  missing?: string;
  claims?: Record<string, WbSnak[] | undefined>;
  sitelinks?: Record<string, unknown>;
};

function extractSitelinkCount(entity: WbEntity | undefined): number {
  const sl = entity?.sitelinks;
  if (!sl || typeof sl !== "object") return 0;
  return Object.keys(sl).length;
}

/** Нормализует Q-id для ключей Map и запросов API. */
export function normalizeWikidataItemId(raw: string): string {
  const s = raw.trim();
  const m = s.match(/^Q?(\d+)$/i);
  return m ? `Q${m[1]}` : s;
}

function itemIdFromSnakValue(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { id?: string; "numeric-id"?: number };
  if (typeof o.id === "string") return normalizeWikidataItemId(o.id);
  if (typeof o["numeric-id"] === "number") return `Q${o["numeric-id"]}`;
  return null;
}

function extractItemIdsFromClaims(entity: WbEntity | undefined, prop: string): string[] {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims)) return [];
  const out: string[] = [];
  for (const claim of claims) {
    if (claim.rank === "deprecated") continue;
    const ms = claim.mainsnak;
    if (!ms || ms.snaktype !== "value") continue;
    const id = itemIdFromSnakValue(ms.datavalue?.value);
    if (id) out.push(id);
  }
  return out;
}

function extractYearFromTimeValue(v: unknown): number | undefined {
  if (!v || typeof v !== "object" || !("time" in v)) return undefined;
  const time = (v as { time?: string }).time;
  if (typeof time !== "string") return undefined;
  const m = time.match(/^[+-]?(\d{4})/);
  return m ? parseInt(m[1]!, 10) : undefined;
}

function extractYearFromClaims(entity: WbEntity | undefined, props: string[]): number | undefined {
  for (const prop of props) {
    const claims = entity?.claims?.[prop];
    if (!Array.isArray(claims)) continue;
    for (const claim of claims) {
      if (claim.rank === "deprecated") continue;
      const ms = claim.mainsnak;
      if (!ms || ms.snaktype !== "value") continue;
      const y = extractYearFromTimeValue(ms.datavalue?.value);
      if (y !== undefined) return y;
    }
  }
  return undefined;
}

function extractP31FromEntity(entity: WbEntity | undefined): string[] {
  return extractItemIdsFromClaims(entity, "P31");
}

function buildWikidataClaims(entity: WbEntity | undefined): WikidataClaims | undefined {
  if (!entity?.claims) return undefined;
  const p106 = extractItemIdsFromClaims(entity, "P106");
  const p166 = extractItemIdsFromClaims(entity, "P166");
  const p800 = extractItemIdsFromClaims(entity, "P800");
  const p17 = extractItemIdsFromClaims(entity, "P17");
  const p1435 = extractItemIdsFromClaims(entity, "P1435");
  const p279 = extractItemIdsFromClaims(entity, "P279");
  const birthYear = extractYearFromClaims(entity, ["P569"]);
  const deathYear = extractYearFromClaims(entity, ["P570"]);
  const eventYear = extractYearFromClaims(entity, ["P585", "P582", "P580", "P571"]);

  if (
    p106.length === 0 &&
    p166.length === 0 &&
    p800.length === 0 &&
    p17.length === 0 &&
    p1435.length === 0 &&
    p279.length === 0 &&
    birthYear === undefined &&
    deathYear === undefined &&
    eventYear === undefined
  ) {
    return undefined;
  }

  return {
    p106,
    p166,
    p800,
    p17,
    p1435,
    p279,
    birthYear,
    deathYear,
    eventYear,
  };
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

function needsCategoryEnrichment(c: WikiCard): boolean {
  return c.category == null || normalizeCardCategory(c.category) === "other";
}

/**
 * Подставляет категорию по Wikidata P31 для карточек без category и для «Разное» —
 * последнее нужно, чтобы исправить записи, ошибочно сохранённые как other (например из-за старого бага API).
 */
export async function enrichWikiCardsCategoriesMissing(
  cards: WikiCard[],
): Promise<{ next: WikiCard[]; patched: boolean }> {
  const needsIdx = cards.map((c, i) => (needsCategoryEnrichment(c) ? i : -1)).filter((i) => i >= 0);
  if (needsIdx.length === 0) return { next: cards, patched: false };

  const { rarityFromNotability, maxRarity, normalizeRarity, pageQualityFromExtractCharCount } =
    await import("./rarity");

  const pageIds = [...new Set(needsIdx.map((i) => cards[i]!.pageid))];
  const wbByPage = await fetchWikibaseIdsByRuPageIds(pageIds);
  const wbIds = [...new Set([...wbByPage.values()].map((id) => normalizeWikidataItemId(id)))];
  const metaMap = await fetchWikidataBlisterMetadata(wbIds);

  let patched = false;
  const next: WikiCard[] = cards.map((c) => {
    if (!needsCategoryEnrichment(c)) return c;
    const wbRaw = wbByPage.get(c.pageid);
    if (!wbRaw) {
      const cat: CardCategory = "other";
      if (normalizeCardCategory(c.category) !== cat) patched = true;
      return { ...c, category: cat };
    }
    const wb = normalizeWikidataItemId(wbRaw);
    const m = metaMap.get(wb) ?? metaMap.get(wbRaw) ?? { p31: [], sitelinks: 0 };
    const cat = categoryFromP31Qids(m.p31);
    const pq = pageQualityFromExtractCharCount((c.extract ?? "").length);
    const computedRarity = rarityFromNotability(
      cat,
      m.sitelinks,
      999_999,
      0,
      true,
      m.p31,
      m.claims,
      wb,
      pq,
    );
    const intrinsicRarity = maxRarity(normalizeRarity(c.intrinsicRarity ?? c.rarity), computedRarity);
    const rarity = maxRarity(normalizeRarity(c.rarity), intrinsicRarity);
    const otherSub = cat === "other" ? inferOtherSubcategory(m.p31) : c.otherSubcategory;
    const nextPq = c.pageQuality ?? pq;
    if (
      normalizeCardCategory(c.category) !== cat ||
      normalizeRarity(c.rarity) !== rarity ||
      normalizeRarity(c.intrinsicRarity ?? c.rarity) !== intrinsicRarity ||
      c.otherSubcategory !== otherSub ||
      c.pageQuality !== nextPq
    ) {
      patched = true;
    }
    return {
      ...c,
      category: cat,
      rarity,
      intrinsicRarity,
      otherSubcategory: otherSub,
      pageQuality: nextPq,
    };
  });
  return { next, patched };
}

export type WikidataBlisterMeta = { p31: string[]; sitelinks: number; claims?: WikidataClaims };

/** Лимит Wikidata wbgetentities на число id в одном запросе (см. справку API). */
const WBGETENTITIES_MAX_IDS = 45;

/** P31 + число интервики за один запрос (редкость и категория в блистере). */
export async function fetchWikidataBlisterMetadata(ids: string[]): Promise<Map<string, WikidataBlisterMeta>> {
  const result = new Map<string, WikidataBlisterMeta>();
  if (ids.length === 0) return result;

  const unique = [...new Set(ids.map((id) => normalizeWikidataItemId(String(id))))];

  try {
    for (let i = 0; i < unique.length; i += WBGETENTITIES_MAX_IDS) {
      const slice = unique.slice(i, i + WBGETENTITIES_MAX_IDS);
      const url =
        `https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|sitelinks&format=json&origin=*` +
        `&ids=${encodeURIComponent(slice.join("|"))}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as { entities?: Record<string, WbEntity> };
      const entities = data.entities ?? {};
      for (const id of slice) {
        const ent = entities[id];
        if (!ent || ent.missing !== undefined) {
          result.set(id, { p31: [], sitelinks: 0 });
          continue;
        }
        const claims = buildWikidataClaims(ent);
        result.set(id, {
          p31: extractP31FromEntity(ent),
          sitelinks: extractSitelinkCount(ent),
          ...(claims ? { claims } : {}),
        });
      }
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
