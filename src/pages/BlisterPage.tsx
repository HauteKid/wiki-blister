import { useCallback, useEffect, useMemo, useState } from "react";
import { CardLightbox } from "../components/CardLightbox";
import { CardTile } from "../components/CardTile";
import { useAuth } from "../context/AuthContext";
import { useGameState } from "../context/GameStateContext";
import { canBypassDailyBlisterLimit } from "../lib/blisterAdmin";
import { getMskCalendarDate, formatCountdown, msUntilNextMskMidnight } from "../lib/moscow";
import type { WikiCard } from "../types";
import { drawBlisterCards } from "../lib/wikipedia";

export function BlisterPage() {
  const { user } = useAuth();
  const { todaysPack, clearPackIfStaleForMskDate, afterOpenBlister, error: cloudError } = useGameState();
  const isBlisterAdmin = useMemo(() => canBypassDailyBlisterLimit(user?.email), [user?.email]);
  const [mskToday, setMskToday] = useState(() => getMskCalendarDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState(() => msUntilNextMskMidnight());
  const [zoomed, setZoomed] = useState<WikiCard | null>(null);

  const pack = useMemo(() => {
    if (!todaysPack || todaysPack.mskDate !== mskToday) return null;
    return todaysPack.cards;
  }, [todaysPack, mskToday]);

  const refreshMskDate = useCallback(() => {
    const today = getMskCalendarDate();
    setMskToday(today);
    void clearPackIfStaleForMskDate(today);
    setCountdownMs(msUntilNextMskMidnight());
  }, [clearPackIfStaleForMskDate]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdownMs(msUntilNextMskMidnight());
      const today = getMskCalendarDate();
      if (today !== mskToday) refreshMskDate();
    }, 1000);
    return () => window.clearInterval(id);
  }, [mskToday, refreshMskDate]);

  const openedToday = todaysPack?.mskDate === mskToday;

  const openBlister = async (adminBypass = false) => {
    setError(null);
    const today = getMskCalendarDate();
    if (!adminBypass && todaysPack?.mskDate === today) return;
    setLoading(true);
    try {
      const cards = await drawBlisterCards(today);
      await afterOpenBlister(today, cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  const displayError = error ?? cloudError;

  return (
    <div className="wb-page">
      <header style={{ marginBottom: 20 }}>
        <h1 className="wb-h1">Дневной блистер</h1>
        <p className="wb-lead">
          Раз в сутки по московскому времени — семь карточек из популярных статей русской Википедии: в паке есть «хиты дня» и набор
          разных тем, чтобы коллекция собиралась интереснее. Не открыл вовремя — пак за вчера не вернуть.
        </p>
      </header>

      <section className="wb-panel">
        <p className="wb-muted" style={{ margin: "0 0 6px" }}>
          Сегодня по Москве
        </p>
        <p style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 600, color: "var(--wb-text)" }}>{mskToday}</p>
        <p className="wb-muted" style={{ margin: "0 0 4px" }}>
          До нового блистера
        </p>
        <p className="wb-countdown">{formatCountdown(countdownMs)}</p>
      </section>

      {!openedToday && (
        <button
          type="button"
          className="wb-btn wb-btn--primary wb-btn--block"
          style={{ marginBottom: 20 }}
          onClick={() => void openBlister()}
          disabled={loading}
        >
          {loading ? "Открываем…" : "Открыть блистер"}
        </button>
      )}

      {openedToday && pack && (
        <p className="wb-status-ok">Ты уже открыл сегодняшний пак. Завтра после полуночи по Москве — новый.</p>
      )}

      {isBlisterAdmin && openedToday && (
        <button
          type="button"
          className="wb-btn wb-btn--secondary wb-btn--block"
          style={{ marginBottom: 20 }}
          onClick={() => void openBlister(true)}
          disabled={loading}
        >
          {loading ? "Выдаём…" : "Админ: выдать новый блистер сегодня"}
        </button>
      )}

      {displayError && (
        <p className="wb-status-err" role="alert">
          {displayError}
        </p>
      )}

      {pack && pack.length > 0 && (
        <div className="wb-card-grid">
          {pack.map((c) => (
            <CardTile key={c.pageid} card={c} onActivate={() => setZoomed(c)} />
          ))}
        </div>
      )}

      <CardLightbox card={zoomed} onClose={() => setZoomed(null)} />
    </div>
  );
}
