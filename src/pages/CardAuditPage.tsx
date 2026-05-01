import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGameState } from "../context/GameStateContext";
import { canBypassDailyBlisterLimit } from "../lib/blisterAdmin";
import { CATEGORY_LABEL, normalizeCardCategory } from "../lib/cardCategory";
import { normalizeRarity, RARITY_LABEL } from "../lib/rarity";
import type { CardCategory, CardRarity } from "../types";

const SAMPLE_LIMIT = 100;
const RARITY_ORDER: CardRarity[] = ["common", "rare", "epic", "legendary", "mythic"];
const CATEGORY_ORDER: CardCategory[] = ["person", "country", "place", "event", "culture", "science", "org", "other"];

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function CardAuditPage() {
  const { user } = useAuth();
  const { collection } = useGameState();
  const isAllowed = canBypassDailyBlisterLimit(user?.email);

  const sample = useMemo(() => collection.slice(0, SAMPLE_LIMIT), [collection]);

  const rarityStats = useMemo(() => {
    const counts: Record<CardRarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
    for (const card of sample) counts[normalizeRarity(card.rarity)] += 1;
    return counts;
  }, [sample]);

  const categoryStats = useMemo(() => {
    const counts: Record<CardCategory, number> = {
      person: 0,
      country: 0,
      place: 0,
      event: 0,
      culture: 0,
      science: 0,
      org: 0,
      other: 0,
    };
    for (const card of sample) counts[normalizeCardCategory(card.category)] += 1;
    return counts;
  }, [sample]);

  const cardsByRarity = useMemo(() => {
    const groups: Record<CardRarity, typeof sample> = { common: [], rare: [], epic: [], legendary: [], mythic: [] };
    for (const card of sample) groups[normalizeRarity(card.rarity)].push(card);
    return groups;
  }, [sample]);

  const cardsByCategory = useMemo(() => {
    const groups: Record<CardCategory, typeof sample> = {
      person: [],
      country: [],
      place: [],
      event: [],
      culture: [],
      science: [],
      org: [],
      other: [],
    };
    for (const card of sample) groups[normalizeCardCategory(card.category)].push(card);
    return groups;
  }, [sample]);

  if (!isAllowed) return <Navigate to="/profile" replace />;

  return (
    <div className="wb-page">
      <h1 className="wb-h1">Аналитика редкости и типов</h1>
      <p className="wb-lead" style={{ marginBottom: 14 }}>
        Взяты первые {SAMPLE_LIMIT} карточек из твоей коллекции (от новых к старым) для быстрой проверки логики статусов.
      </p>
      <section className="wb-panel">
        <p className="wb-muted" style={{ margin: "0 0 6px" }}>
          Карточек в выборке
        </p>
        <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--wb-text)" }}>{sample.length}</p>
      </section>

      <section className="wb-panel">
        <h2 className="wb-audit-h2">Разбивка по редкости</h2>
        <div className="wb-audit-list">
          {RARITY_ORDER.map((rarity) => (
            <div className="wb-audit-group" key={rarity}>
              <div className="wb-audit-row">
                <span>{RARITY_LABEL[rarity]}</span>
                <span>
                  {rarityStats[rarity]} ({pct(rarityStats[rarity], sample.length)})
                </span>
              </div>
              <div className="wb-audit-mini-grid">
                {cardsByRarity[rarity].map((card) => (
                  <article className="wb-audit-mini" key={`r-${rarity}-${card.pageid}`}>
                    <p className="wb-audit-mini__title">{card.title}</p>
                    <p className="wb-audit-mini__meta">
                      {CATEGORY_LABEL[normalizeCardCategory(card.category)]} · {card.openedMskDate}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wb-panel">
        <h2 className="wb-audit-h2">Разбивка по типу</h2>
        <div className="wb-audit-list">
          {CATEGORY_ORDER.map((cat) => (
            <div className="wb-audit-group" key={cat}>
              <div className="wb-audit-row">
                <span>{CATEGORY_LABEL[cat]}</span>
                <span>
                  {categoryStats[cat]} ({pct(categoryStats[cat], sample.length)})
                </span>
              </div>
              <div className="wb-audit-mini-grid">
                {cardsByCategory[cat].map((card) => (
                  <article className="wb-audit-mini" key={`c-${cat}-${card.pageid}`}>
                    <p className="wb-audit-mini__title">{card.title}</p>
                    <p className="wb-audit-mini__meta">
                      {RARITY_LABEL[normalizeRarity(card.rarity)]} · {card.openedMskDate}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
