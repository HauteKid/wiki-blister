import type { CardCategory, CardOtherSubcategory, CardRarity, WikiCard, WikidataClaims } from "../types";
import {
  inferOtherSubcategory,
  normalizeCardCategory,
  normalizeCardOtherSubcategory,
} from "./cardCategory";
import { ENTITY_BLOCK_MYTHIC, ENTITY_INTRINSIC_FLOOR } from "./rarityOverrideData";

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

export function shiftRarity(base: CardRarity, delta: number): CardRarity {
  const nextTier = Math.min(ORDER.length - 1, Math.max(0, rarityTier(base) + delta));
  return ORDER[nextTier]!;
}

/** Ограничить редкость сверху (не выше `max`). */
export function capRarityAt(current: CardRarity, max: CardRarity): CardRarity {
  return ORDER[Math.min(rarityTier(current), rarityTier(max))]!;
}

export function normalizeRarity(x: unknown): CardRarity {
  if (x === "common" || x === "rare" || x === "epic" || x === "legendary" || x === "mythic") return x;
  return "common";
}

function normalizeWbId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.trim().match(/^Q?(\d+)$/i);
  return m ? `Q${m[1]}` : raw.trim();
}

function hasAny(values: string[] | undefined, targets: readonly string[]): boolean {
  if (!values?.length) return false;
  const set = new Set(values);
  return targets.some((t) => set.has(t));
}

/** Бонус к ступени от дневного топа и просмотров (не назначает mythic напрямую). */
export function popularityShift(rank: number, views: number): number {
  if (rank <= 1) return 2;
  if (rank <= 8) return 1;
  if (views >= 400_000) return 1;
  if (views >= 150_000) return 0;
  return 0;
}

/**
 * @deprecated Раньше mythic шла напрямую от ранга; оставлено для совместимости.
 * Сейчас эквивалентно: common + {@link popularityShift}.
 */
export function rarityFromPopularity(rank: number, views: number): CardRarity {
  return shiftRarity("common", popularityShift(rank, views));
}

/** Минимальное число sitelinks для каждой ступени редкости внутри категории карточки. */
export type SitelinkThresholds = { mythic: number; legendary: number; epic: number; rare: number };

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

export function sitelinkThresholdsForCategory(category: CardCategory): SitelinkThresholds {
  return SITELINKS_BY_CATEGORY[normalizeCardCategory(category)];
}

/** Плавная шкала: log1p(интервики) между порогами категории → дробная ступень, затем округление. */
function tierFloatFromLogSitelinks(cat: CardCategory, sitelinkCount: number): number {
  const c = normalizeCardCategory(cat);
  const t = SITELINKS_BY_CATEGORY[c];
  const x = Math.log1p(Math.max(0, sitelinkCount));
  const pts: [number, number][] = [
    [Math.log1p(0), 0],
    [Math.log1p(t.rare), 1],
    [Math.log1p(t.epic), 2],
    [Math.log1p(t.legendary), 3],
    [Math.log1p(t.mythic), 4],
  ];
  if (x >= pts[pts.length - 1]![0]) return 4;
  if (x <= pts[0]![0]) return pts[0]![1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [xa, ya] = pts[i]!;
    const [xb, yb] = pts[i + 1]!;
    const lastSeg = i === pts.length - 2;
    if (x <= xb || lastSeg) {
      const span = xb - xa;
      const f = span > 0 ? (Math.min(x, xb) - xa) / span : 0;
      const y = ya + f * (yb - ya);
      return x > xb && lastSeg ? yb : y;
    }
  }
  return 4;
}

/** Базовая редкость только по sitelinks (непрерывная шкала по логарифму интервики). */
export function rarityFromSitelinkScore(category: CardCategory, sitelinkCount: number): CardRarity {
  const f = tierFloatFromLogSitelinks(category, sitelinkCount);
  const idx = Math.round(Math.min(4, Math.max(0, f)));
  return ORDER[idx]!;
}

export function rarityFromSitelinksForCategory(category: CardCategory, sitelinkCount: number): CardRarity {
  return rarityFromSitelinkScore(category, sitelinkCount);
}

/** Прокси «качества статьи» 0…1 по длине анонса (ТЗ: pageQuality). */
export function pageQualityFromExtractCharCount(charLength: number): number {
  if (charLength <= 0) return 0;
  return Math.min(1, charLength / 7200);
}

function applyPageQualityShift(rarity: CardRarity, pageQuality: number | undefined): CardRarity {
  if (pageQuality === undefined) return rarity;
  if (pageQuality >= 0.78) return shiftRarity(rarity, 1);
  if (pageQuality <= 0.1) return shiftRarity(rarity, -1);
  return rarity;
}

function applyManualIntrinsicOverrides(r: CardRarity, wikibaseItemId?: string): CardRarity {
  const id = normalizeWbId(wikibaseItemId);
  if (!id) return r;
  if (ENTITY_BLOCK_MYTHIC.has(id)) return capRarityAt(r, "legendary");
  const floor = ENTITY_INTRINSIC_FLOOR[id];
  if (floor) return maxRarity(r, floor);
  return r;
}

/* ─── Country ─── */

const HISTORICAL_COUNTRY_TYPES = ["Q3024240", "Q11209920", "Q1250464", "Q48349"] as const;
const MODERN_STATE_TYPES = ["Q6256", "Q3624078", "Q7275"] as const;
const TERRITORY_OR_REGION_TYPES = ["Q56061", "Q15642541", "Q82794"] as const;

const MYTHIC_COUNTRY_ALLOWLIST = new Set(["Q237"]); // Vatican City — при необходимости расширять

function hasHistoricalCountryType(p31: string[]): boolean {
  return hasAny(p31, HISTORICAL_COUNTRY_TYPES);
}

function hasModernStateType(p31: string[]): boolean {
  return hasAny(p31, MODERN_STATE_TYPES);
}

function hasTerritoryOrRegionType(p31: string[]): boolean {
  return hasAny(p31, TERRITORY_OR_REGION_TYPES);
}

export function maxCountryRarity(p31: string[], wikibaseItemId?: string): CardRarity {
  const wb = normalizeWbId(wikibaseItemId);
  if (wb && MYTHIC_COUNTRY_ALLOWLIST.has(wb)) return "mythic";
  if (hasHistoricalCountryType(p31)) return "mythic";
  if (hasModernStateType(p31)) return "legendary";
  if (hasTerritoryOrRegionType(p31)) return "epic";
  return "legendary";
}

function adjustCountryRarity(rarity: CardRarity, p31: string[]): CardRarity {
  let shift = 0;
  if (hasHistoricalCountryType(p31)) shift += 1;
  if (hasModernStateType(p31)) shift -= 1;
  if (hasTerritoryOrRegionType(p31)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/** Для подсказок админу: суммарный сдвиг ступеней для страны от P31 при базе common. */
export function countryRarityNotabilityDelta(p31Qids: string[]): number {
  return rarityTier(adjustCountryRarity("common", p31Qids)) - rarityTier("common");
}

/* ─── Place ─── */

const HIGH_VALUE_PLACE_TYPES = [
  "Q839954",
  "Q4989906",
  "Q23413",
  "Q24354",
  "Q33506",
  "Q16970",
  "Q44539",
] as const;

const ORDINARY_SETTLEMENT_TYPES = ["Q515", "Q3957", "Q532", "Q486972"] as const;
const TRANSPORT_OR_ADMIN_PLACE_TYPES = ["Q1248784", "Q55488", "Q56061"] as const;

function hasHeritageDesignation(claims: WikidataClaims | undefined): boolean {
  return (claims?.p1435?.length ?? 0) > 0;
}

function hasHighPlaceArchitectureType(p31: string[]): boolean {
  return hasAny(p31, HIGH_VALUE_PLACE_TYPES);
}

function hasStrongPlaceSignal(p31: string[], claims: WikidataClaims | undefined): boolean {
  if (hasHighPlaceArchitectureType(p31)) return true;
  if (hasHeritageDesignation(claims)) return true;
  return false;
}

function hasOrdinarySettlementType(p31: string[]): boolean {
  return hasAny(p31, ORDINARY_SETTLEMENT_TYPES);
}

function hasTransportOrAdministrativePlaceType(p31: string[]): boolean {
  return hasAny(p31, TRANSPORT_OR_ADMIN_PLACE_TYPES);
}

export function maxPlaceRarity(p31: string[], claims: WikidataClaims | undefined): CardRarity {
  if (hasStrongPlaceSignal(p31, claims)) return "mythic";
  if (hasOrdinarySettlementType(p31)) return "legendary";
  if (hasTransportOrAdministrativePlaceType(p31)) return "epic";
  return "mythic";
}

function adjustPlaceRarity(rarity: CardRarity, p31: string[], claims: WikidataClaims | undefined): CardRarity {
  let shift = 0;
  if (hasStrongPlaceSignal(p31, claims)) shift += 1;
  if (hasOrdinarySettlementType(p31)) shift -= 1;
  if (hasTransportOrAdministrativePlaceType(p31)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Person ─── */

const HIGH_VALUE_OCCUPATIONS = [
  "Q901",
  "Q4964182",
  "Q205375",
  "Q36180",
  "Q1028181",
  "Q36834",
  "Q116",
  "Q47064",
  "Q11900058",
] as const;

/** Только «медийные» профессии без сильных наград/работ — потолок legendary. */
const MEDIA_ENTERTAINMENT_OCCUPATIONS = [
  "Q33999",
  "Q177220",
  "Q3282637",
  "Q947873",
  "Q57183",
  "Q2405480",
  "Q107987",
  "Q28389",
  "Q753110",
] as const;

const MEDIA_ENTERTAINMENT_SET = new Set<string>(MEDIA_ENTERTAINMENT_OCCUPATIONS);

function hasHistoricallyImportantOccupation(claims: WikidataClaims | undefined): boolean {
  return hasAny(claims?.p106, HIGH_VALUE_OCCUPATIONS);
}

function hasMajorAwardsOrWorks(claims: WikidataClaims | undefined): boolean {
  return (claims?.p166?.length ?? 0) > 0 || (claims?.p800?.length ?? 0) > 0;
}

function isModernMediaPerson(claims: WikidataClaims | undefined): boolean {
  const occ = claims?.p106;
  if (!occ?.length) return false;
  if (hasMajorAwardsOrWorks(claims)) return false;
  if (hasHistoricallyImportantOccupation(claims)) return false;
  return occ.every((q) => MEDIA_ENTERTAINMENT_SET.has(q));
}

export function maxPersonRarity(
  _p31: string[],
  claims: WikidataClaims | undefined,
  hasWikibase: boolean,
): CardRarity {
  if (!hasWikibase) return "epic";
  if (isModernMediaPerson(claims)) return "legendary";
  return "mythic";
}

function adjustPersonRarity(rarity: CardRarity, claims: WikidataClaims | undefined): CardRarity {
  let positiveShift = 0;
  if (hasHistoricallyImportantOccupation(claims)) positiveShift = Math.max(positiveShift, 1);
  if (hasMajorAwardsOrWorks(claims)) positiveShift = Math.max(positiveShift, 1);
  let negativeShift = 0;
  if (isModernMediaPerson(claims)) negativeShift = -1;
  return shiftRarity(rarity, positiveShift + negativeShift);
}

/* ─── Event ─── */

const MAJOR_HISTORICAL_EVENT_TYPES = ["Q198", "Q15981195", "Q10931", "Q3241045"] as const;
const MINOR_OR_RECURRING_EVENT_TYPES = [
  "Q27020041",
  "Q16510064",
  "Q40231",
  "Q159813",
  "Q27968055",
  "Q500834",
] as const;

function hasMajorHistoricalEventType(p31: string[]): boolean {
  return hasAny(p31, MAJOR_HISTORICAL_EVENT_TYPES);
}

function hasMinorOrRecurringEventType(p31: string[]): boolean {
  return hasAny(p31, MINOR_OR_RECURRING_EVENT_TYPES);
}

function isVeryRecentEvent(claims: WikidataClaims | undefined): boolean {
  const y = claims?.eventYear;
  if (y === undefined) return false;
  const nowY = new Date().getUTCFullYear();
  return y > nowY - 2;
}

export function maxEventRarity(
  p31: string[],
  claims: WikidataClaims | undefined,
  hasWikibase: boolean,
): CardRarity {
  if (hasMajorHistoricalEventType(p31)) return "mythic";
  if (hasMinorOrRecurringEventType(p31)) return "epic";
  if (!hasWikibase) return "epic";
  if (isVeryRecentEvent(claims) && !hasMajorHistoricalEventType(p31)) return "epic";
  return "legendary";
}

function adjustEventRarity(rarity: CardRarity, p31: string[], claims: WikidataClaims | undefined): CardRarity {
  let shift = 0;
  if (hasMajorHistoricalEventType(p31)) shift += 1;
  if (hasMinorOrRecurringEventType(p31)) shift -= 1;
  if (isVeryRecentEvent(claims) && !hasMajorHistoricalEventType(p31)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Culture ─── */

const MAJOR_CULTURE_TYPES = [
  "Q7725634",
  "Q3305213",
  "Q11424",
  "Q482994",
  "Q571",
  "Q9134",
  "Q9174",
  "Q1792379",
  "Q7889",
] as const;

const MINOR_MEDIA_TYPES = ["Q21191270", "Q3464665", "Q15711870"] as const;

function hasMajorCultureType(p31: string[]): boolean {
  return hasAny(p31, MAJOR_CULTURE_TYPES);
}

function hasMinorMediaType(p31: string[]): boolean {
  return hasAny(p31, MINOR_MEDIA_TYPES);
}

export function maxCultureRarity(p31: string[], _claims: WikidataClaims | undefined): CardRarity {
  if (hasMinorMediaType(p31)) return "rare";
  if (hasMajorCultureType(p31)) return "mythic";
  return "legendary";
}

function adjustCultureRarity(rarity: CardRarity, p31: string[]): CardRarity {
  let shift = 0;
  if (hasMajorCultureType(p31)) shift += 1;
  if (hasMinorMediaType(p31)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Science ─── */

const FUNDAMENTAL_SCIENCE_TYPES = [
  "Q17737",
  "Q1936384",
  "Q17376347",
  "Q11344",
  "Q11379",
  "Q8142",
] as const;

const NARROW_SCIENCE_TYPES = [
  "Q80585",
  "Q18918145",
  "Q17637585",
  "Q14827493",
  "Q193424",
  "Q30619513",
] as const;

function scienceInstanceIds(p31: string[], claims?: WikidataClaims): string[] {
  return [...p31, ...(claims?.p279 ?? [])];
}

function hasFundamentalScienceType(p31: string[], claims?: WikidataClaims): boolean {
  return hasAny(scienceInstanceIds(p31, claims), FUNDAMENTAL_SCIENCE_TYPES);
}

function hasNarrowTechnicalType(p31: string[], claims?: WikidataClaims): boolean {
  return hasAny(scienceInstanceIds(p31, claims), NARROW_SCIENCE_TYPES);
}

export function maxScienceRarity(p31: string[], claims: WikidataClaims | undefined): CardRarity {
  if (hasNarrowTechnicalType(p31, claims)) return "epic";
  return "mythic";
}

function adjustScienceRarity(rarity: CardRarity, p31: string[], claims?: WikidataClaims): CardRarity {
  let shift = 0;
  if (hasFundamentalScienceType(p31, claims)) shift += 1;
  if (hasNarrowTechnicalType(p31, claims)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Other / подтипы ─── */

function maxOtherRarity(_p31: string[], _sub: CardOtherSubcategory): CardRarity {
  return "legendary";
}

function adjustOtherRarity(rarity: CardRarity, p31: string[], sub: CardOtherSubcategory): CardRarity {
  let shift = 0;
  if (sub === "artifact" && hasAny(p31, ["Q49843", "Q15243209", "Q206706"])) shift += 1;
  if (sub === "concept") shift -= 1;
  if (sub === "species") shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Org ─── */

const GLOBAL_HISTORICAL_ORG_TYPES = ["Q484652", "Q3918", "Q31855", "Q1130172"] as const;
const ORDINARY_COMMERCIAL_ORG_TYPES = ["Q4830453", "Q6881511", "Q891723"] as const;
const SPORTS_CLUB_TYPES = ["Q847017", "Q476028"] as const;

const MYTHIC_ORG_ALLOWLIST = new Set(["Q1065", "Q23548"]);

function hasGlobalHistoricalOrgType(p31: string[]): boolean {
  return hasAny(p31, GLOBAL_HISTORICAL_ORG_TYPES);
}

function hasOrdinaryCommercialOrgType(p31: string[]): boolean {
  return hasAny(p31, ORDINARY_COMMERCIAL_ORG_TYPES);
}

function hasSportsClubType(p31: string[]): boolean {
  return hasAny(p31, SPORTS_CLUB_TYPES);
}

export function maxOrgRarity(
  p31: string[],
  _claims: WikidataClaims | undefined,
  wikibaseItemId?: string,
): CardRarity {
  const wb = normalizeWbId(wikibaseItemId);
  if (wb && MYTHIC_ORG_ALLOWLIST.has(wb)) return "mythic";
  if (hasGlobalHistoricalOrgType(p31)) return "mythic";
  if (hasOrdinaryCommercialOrgType(p31)) return "epic";
  if (hasSportsClubType(p31)) return "epic";
  return "legendary";
}

function adjustOrgRarity(rarity: CardRarity, p31: string[]): CardRarity {
  let shift = 0;
  if (hasGlobalHistoricalOrgType(p31)) shift += 1;
  if (hasOrdinaryCommercialOrgType(p31)) shift -= 1;
  if (hasSportsClubType(p31)) shift -= 1;
  return shiftRarity(rarity, shift);
}

/* ─── Центральные функции ─── */

export function maxRarityByCategoryAndP31(
  category: CardCategory,
  p31: string[] = [],
  claims: WikidataClaims | undefined,
  hasWikibase: boolean,
  wikibaseItemId?: string,
): CardRarity {
  if (!hasWikibase) return "epic";
  const cat = normalizeCardCategory(category);
  switch (cat) {
    case "country":
      return maxCountryRarity(p31, wikibaseItemId);
    case "person":
      return maxPersonRarity(p31, claims, hasWikibase);
    case "place":
      return maxPlaceRarity(p31, claims);
    case "event":
      return maxEventRarity(p31, claims, hasWikibase);
    case "culture":
      return maxCultureRarity(p31, claims);
    case "science":
      return maxScienceRarity(p31, claims);
    case "org":
      return maxOrgRarity(p31, claims, wikibaseItemId);
    case "other":
      return maxOtherRarity(p31, inferOtherSubcategory(p31));
    default:
      return "legendary";
  }
}

export function applyCategoryModifiers(
  rarity: CardRarity,
  category: CardCategory,
  p31: string[] = [],
  claims?: WikidataClaims,
): CardRarity {
  const cat = normalizeCardCategory(category);
  switch (cat) {
    case "country":
      return adjustCountryRarity(rarity, p31);
    case "place":
      return adjustPlaceRarity(rarity, p31, claims);
    case "person":
      return adjustPersonRarity(rarity, claims);
    case "event":
      return adjustEventRarity(rarity, p31, claims);
    case "culture":
      return adjustCultureRarity(rarity, p31);
    case "science":
      return adjustScienceRarity(rarity, p31, claims);
    case "org":
      return adjustOrgRarity(rarity, p31);
    case "other":
      return adjustOtherRarity(rarity, p31, inferOtherSubcategory(p31));
    default:
      return rarity;
  }
}

/**
 * Внутренняя редкость карточки (intrinsic): sitelinks → модификаторы → потолок по типу.
 * Без Wikidata: старт с common, только бонус популярности, потолок epic.
 */
export function rarityFromNotability(
  category: CardCategory,
  sitelinkCount: number | undefined,
  rank: number,
  views: number,
  hasWikibase: boolean,
  p31Qids: string[] = [],
  claims?: WikidataClaims,
  wikibaseItemId?: string,
  pageQuality?: number,
): CardRarity {
  const cat = normalizeCardCategory(category);
  const p31 = p31Qids;

  let base: CardRarity;
  if (hasWikibase && typeof sitelinkCount === "number") {
    base = rarityFromSitelinksForCategory(cat, sitelinkCount);
  } else {
    base = shiftRarity("common", popularityShift(rank, views));
  }

  let adjusted = applyCategoryModifiers(base, cat, p31, claims);
  adjusted = applyPageQualityShift(adjusted, pageQuality);
  const max = maxRarityByCategoryAndP31(cat, p31, claims, hasWikibase, wikibaseItemId);
  let out = capRarityAt(adjusted, max);
  out = applyManualIntrinsicOverrides(out, wikibaseItemId);
  return out;
}

/** Редкость нормализуем всегда; категорию — только если уже есть в JSON (старые карточки без поля догружаем отдельно). */
export function normalizeWikiCard(c: WikiCard): WikiCard {
  const rarity = normalizeRarity(c.rarity);
  const intrinsicRarity = normalizeRarity(c.intrinsicRarity ?? c.rarity);
  const { category, otherSubcategory, ...rest } = c;
  const next: WikiCard = {
    ...rest,
    rarity,
    intrinsicRarity,
    ...(category != null ? { category: normalizeCardCategory(category) } : {}),
    ...(otherSubcategory != null
      ? { otherSubcategory: normalizeCardOtherSubcategory(otherSubcategory) }
      : {}),
    ...(c.pageQuality !== undefined ? { pageQuality: c.pageQuality } : {}),
    ...(c.favorite !== undefined ? { favorite: Boolean(c.favorite) } : {}),
  };
  return next;
}
