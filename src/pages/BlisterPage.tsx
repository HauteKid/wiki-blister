import { useCallback, useEffect, useMemo, useState } from "react";
import { CardTile } from "../components/CardTile";
import { getMskCalendarDate, formatCountdown, msUntilNextMskMidnight } from "../lib/moscow";
import {
  loadCollection,
  loadTodaysPack,
  mergeIntoCollection,
  reconcileTodaysPackWithMskDate,
  saveCollection,
  saveTodaysPack,
} from "../lib/storage";
import { drawFiveCards } from "../lib/wikipedia";
import type { WikiCard } from "../types";

export function BlisterPage() {
  const [mskToday, setMskToday] = useState(() => getMskCalendarDate());
  const [pack, setPack] = useState<WikiCard[] | null>(() => reconcileTodaysPackWithMskDate(getMskCalendarDate())?.cards ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState(() => msUntilNextMskMidnight());

  const refreshMskDate = useCallback(() => {
    const today = getMskCalendarDate();
    setMskToday(today);
    const valid = reconcileTodaysPackWithMskDate(today);
    setPack(valid?.cards ?? null);
    setCountdownMs(msUntilNextMskMidnight());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdownMs(msUntilNextMskMidnight());
      const today = getMskCalendarDate();
      if (today !== mskToday) refreshMskDate();
    }, 1000);
    return () => window.clearInterval(id);
  }, [mskToday, refreshMskDate]);

  const openedToday = useMemo(() => {
    const stored = loadTodaysPack();
    return stored?.mskDate === mskToday;
  }, [mskToday, pack]);

  const openBlister = async () => {
    setError(null);
    const today = getMskCalendarDate();
    if (loadTodaysPack()?.mskDate === today) {
      setPack(loadTodaysPack()!.cards);
      return;
    }
    setLoading(true);
    try {
      const cards = await drawFiveCards(today);
      saveTodaysPack({ mskDate: today, cards });
      const merged = mergeIntoCollection(loadCollection(), cards);
      saveCollection(merged);
      window.dispatchEvent(new Event("wiki-blister-updated"));
      setPack(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 560, margin: "0 auto" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 26, color: "#f8fafc" }}>Дневной блистер</h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 15 }}>
          Раз в сутки по московскому времени — пять карточек из популярных статей русской Википедии. Не открыл вовремя — пак за вчера
          не вернуть.
        </p>
      </header>

      <section
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          border: "1px solid rgba(148, 163, 184, 0.12)",
        }}
      >
        <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: 13 }}>Сегодня по Москве</p>
        <p style={{ margin: "0 0 12px", fontSize: 18, color: "#e2e8f0" }}>{mskToday}</p>
        <p style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: 13 }}>До нового блистера</p>
        <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 22, color: "#7dd3fc" }}>
          {formatCountdown(countdownMs)}
        </p>
      </section>

      {!openedToday && (
        <button
          type="button"
          onClick={() => void openBlister()}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 14,
            border: "none",
            background: loading ? "#475569" : "linear-gradient(135deg, #0ea5e9, #6366f1)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 20,
            boxShadow: loading ? "none" : "0 8px 24px rgba(14, 165, 233, 0.35)",
          }}
        >
          {loading ? "Открываем…" : "Открыть блистер"}
        </button>
      )}

      {openedToday && pack && (
        <p style={{ color: "#86efac", margin: "0 0 16px", fontSize: 15 }}>Ты уже открыл сегодняшний пак. Завтра после полуночи по Москве — новый.</p>
      )}

      {error && (
        <p style={{ color: "#fca5a5", margin: "0 0 16px" }} role="alert">
          {error}
        </p>
      )}

      {pack && pack.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pack.map((c) => (
            <CardTile key={c.pageid} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
