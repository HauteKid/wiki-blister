import type { WikiCard } from "../types";
import {
  CATEGORY_LABEL,
  categoryFromP31Qids,
  fetchWikibaseIdsByRuPageIds,
  fetchWikidataBlisterMetadata,
  normalizeCardCategory,
  normalizeWikidataItemId,
} from "./cardCategory";
import {
  applyCategoryModifiers,
  capRarityAt,
  countryRarityNotabilityDelta,
  maxRarityByCategoryAndP31,
  pageQualityFromExtractCharCount,
  RARITY_LABEL,
  rarityFromNotability,
  rarityFromSitelinkScore,
  normalizeRarity,
  shiftRarity,
  sitelinkThresholdsForCategory,
} from "./rarity";

function formatThresholds(cat: ReturnType<typeof normalizeCardCategory>): string {
  const t = sitelinkThresholdsForCategory(cat);
  const name = CATEGORY_LABEL[cat];
  return `Шкала «${name}»: миф ≥${t.mythic} интервики; легендарная ≥${t.legendary}; эпическая ≥${t.epic}; редкая ≥${t.rare}; иначе обычная.`;
}

/**
 * Текст для админ-подсказки: откуда берётся редкость по текущим данным Wikidata
 * (и чем может отличаться сохранённое значение на карточке).
 */
export async function fetchAdminRarityExplanation(card: WikiCard): Promise<string> {
  const storedRarity = normalizeRarity(card.rarity);
  const storedCat = normalizeCardCategory(card.category);

  const wbMap = await fetchWikibaseIdsByRuPageIds([card.pageid]);
  const wbRaw = wbMap.get(card.pageid);

  if (!wbRaw) {
    return [
      `На карточке сейчас: «${RARITY_LABEL[storedRarity]}», тип UI: «${CATEGORY_LABEL[storedCat]}».`,
      "",
      "Элемент Wikidata для этой страницы ru.wikipedia (pageid) не найден — редкость считалась только по дневному топу просмотров (ранг и число просмотров). Эти значения в JSON карточки не сохраняются, поэтому здесь точный ранг/просмотры восстановить нельзя.",
      "",
      "Правила сейчас (без Wikidata): старт с «Обычная», затем бонус только на несколько ступеней вверх (ранг №1 даёт +2 ступени, места примерно до 8-го — +1, большие просмотры — ещё +1). Потолок без Wikidata — «Эпическая», мифическую так не получить.",
    ].join("\n");
  }

  const wb = normalizeWikidataItemId(wbRaw);
  const metaMap = await fetchWikidataBlisterMetadata([wb]);
  const m = metaMap.get(wb) ?? metaMap.get(wbRaw) ?? { p31: [], sitelinks: 0 };
  const wdCat = categoryFromP31Qids(m.p31);
  const pq = pageQualityFromExtractCharCount((card.extract ?? "").length);
  const baseFromSitelinks = rarityFromSitelinkScore(wdCat, m.sitelinks);
  const afterModifiers = applyCategoryModifiers(baseFromSitelinks, wdCat, m.p31, m.claims);
  const afterQuality =
    pq >= 0.78 ? shiftRarity(afterModifiers, 1) : pq <= 0.1 ? shiftRarity(afterModifiers, -1) : afterModifiers;
  const maxR = maxRarityByCategoryAndP31(wdCat, m.p31, m.claims, true, wb);
  const computed = capRarityAt(afterQuality, maxR);
  const computedFull = rarityFromNotability(wdCat, m.sitelinks, 999_999, 0, true, m.p31, m.claims, wb, pq);
  const delta = wdCat === "country" ? countryRarityNotabilityDelta(m.p31) : 0;

  const p31Preview =
    m.p31.length > 0 ? m.p31.slice(0, 12).join(", ") + (m.p31.length > 12 ? "…" : "") : "—";

  const lines: string[] = [
    `На карточке: «${RARITY_LABEL[storedRarity]}», тип UI: «${CATEGORY_LABEL[storedCat]}».`,
    "",
    `Актуально по Wikidata (Q ${wb}): интервики ${m.sitelinks}; тип по P31: «${CATEGORY_LABEL[wdCat]}».`,
    `P31 (фрагмент): ${p31Preview}`,
    formatThresholds(wdCat),
    `Шаг 1 — база по интервики (плавная шкала log1p, не скачки 167↔168): «${RARITY_LABEL[baseFromSitelinks]}».`,
    `Шаг 2 — сдвиг по типу (P31, claims, при науке ещё один шаг P279): «${RARITY_LABEL[afterModifiers]}».`,
    `Качество анонса (длина текста карточки, 0…1): ${pq.toFixed(2)} → после поправки: «${RARITY_LABEL[afterQuality]}».`,
    `Шаг 3 — потолок по категории/типу: не выше «${RARITY_LABEL[maxR]}».`,
    `Итог после потолка (до ручных оверрайдов в rarityOverrideData): «${RARITY_LABEL[computed]}».`,
  ];

  if (wdCat === "country" && delta !== 0) {
    lines.push(
      delta > 0
        ? "К странам: в P31 есть историческое/имперское/бывшее государство → в шаге 2 ступень выше базы."
        : "К странам: в P31 есть современное государство или территория → в шаге 2 ступень ниже базы (в пределах порога).",
    );
  }

  lines.push(`Проверка одной функцией rarityFromNotability: «${RARITY_LABEL[computedFull]}».`);

  if (storedRarity !== computedFull || storedCat !== wdCat) {
    lines.push(
      "",
      "Если отличается от «на карточке»: редкость могла быть посчитана при других sitelinks, до правок формул, по топу без WD, или после обогащения типа карточка ещё не пересохранилась.",
    );
  }

  return lines.join("\n");
}
