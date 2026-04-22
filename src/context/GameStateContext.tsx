import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMskCalendarDate } from "../lib/moscow";
import { normalizeWikiCard } from "../lib/rarity";
import { mergeIntoCollection } from "../lib/storage";
import { requireSupabase } from "../lib/supabaseClient";
import type { TodaysPack, WikiCard } from "../types";
import { useAuth } from "./AuthContext";

type GameStateContextValue = {
  collection: WikiCard[];
  todaysPack: TodaysPack | null;
  loading: boolean;
  error: string | null;
  clearPackIfStaleForMskDate: (mskToday: string) => Promise<void>;
  afterOpenBlister: (mskDate: string, cards: WikiCard[]) => Promise<void>;
  resetAllProgress: () => Promise<void>;
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

function parseCollection(raw: unknown): WikiCard[] {
  if (!Array.isArray(raw)) return [];
  return (raw as WikiCard[]).map(normalizeWikiCard);
}

function normalizeTodaysPack(p: TodaysPack | null): TodaysPack | null {
  if (!p) return null;
  return { mskDate: p.mskDate, cards: p.cards.map(normalizeWikiCard) };
}

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collection, setCollection] = useState<WikiCard[]>([]);
  const [todaysPack, setTodaysPack] = useState<TodaysPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const packRef = useRef<TodaysPack | null>(null);
  const collectionRef = useRef<WikiCard[]>([]);

  useEffect(() => {
    packRef.current = todaysPack;
  }, [todaysPack]);

  useEffect(() => {
    collectionRef.current = collection;
  }, [collection]);

  useEffect(() => {
    if (!user) {
      setCollection([]);
      setTodaysPack(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadDeadlineMs = 25_000;
    const withTimeout = <T,>(p: PromiseLike<T>, ms: number): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) =>
          window.setTimeout(
            () => rej(new Error(`Нет ответа от базы за ${ms / 1000} с. Проверьте сеть или VPN.`)),
            ms,
          ),
        ),
      ]);

    (async () => {
      const db = requireSupabase();
      setLoading(true);
      setError(null);
      try {
        const { data, error: selErr } = await withTimeout(
          db.from("user_state").select("collection,todays_pack").eq("user_id", user.id).maybeSingle(),
          loadDeadlineMs,
        );

        if (selErr) throw selErr;

        if (!data) {
          const { error: insErr } = await withTimeout(
            db.from("user_state").insert({ user_id: user.id }),
            loadDeadlineMs,
          );
          if (insErr && insErr.code !== "23505") throw insErr;
          const { data: again, error: againErr } = await withTimeout(
            db.from("user_state").select("collection,todays_pack").eq("user_id", user.id).maybeSingle(),
            loadDeadlineMs,
          );
          if (againErr) throw againErr;
          if (cancelled) return;
          setCollection(parseCollection(again?.collection));
          setTodaysPack(null);
          return;
        }

        const today = getMskCalendarDate();
        let pack = data.todays_pack as TodaysPack | null;
        if (pack && pack.mskDate !== today) {
          pack = null;
          await withTimeout(
            db
              .from("user_state")
              .update({ todays_pack: null, updated_at: new Date().toISOString() })
              .eq("user_id", user.id),
            loadDeadlineMs,
          );
        }

        if (cancelled) return;
        setCollection(parseCollection(data.collection));
        setTodaysPack(normalizeTodaysPack(pack));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const clearPackIfStaleForMskDate = useCallback(async (mskToday: string) => {
    if (!user) return;
    const db = requireSupabase();
    const current = packRef.current;
    if (!current || current.mskDate === mskToday) return;
    setTodaysPack(null);
    const { error: upErr } = await db
      .from("user_state")
      .update({ todays_pack: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (upErr) setError(upErr.message);
  }, [user?.id]);

  const afterOpenBlister = useCallback(async (mskDate: string, cards: WikiCard[]) => {
    if (!user) return;
    const db = requireSupabase();
    setError(null);
    const merged = mergeIntoCollection(collectionRef.current, cards);
    const nextPack: TodaysPack = { mskDate, cards };
    const { error: upErr } = await db
      .from("user_state")
      .update({
        collection: merged,
        todays_pack: nextPack,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (upErr) {
      setError(upErr.message);
      throw upErr;
    }
    setCollection(merged);
    setTodaysPack(nextPack);
  }, [user?.id]);

  const resetAllProgress = useCallback(async () => {
    if (!user) return;
    const db = requireSupabase();
    setError(null);
    const empty: WikiCard[] = [];
    const { error: upErr } = await db
      .from("user_state")
      .update({
        collection: empty,
        todays_pack: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (upErr) {
      setError(upErr.message);
      throw new Error(upErr.message);
    }
    setCollection(empty);
    setTodaysPack(null);
  }, [user?.id]);

  const value = useMemo<GameStateContextValue>(
    () => ({
      collection,
      todaysPack,
      loading,
      error,
      clearPackIfStaleForMskDate,
      afterOpenBlister,
      resetAllProgress,
    }),
    [collection, todaysPack, loading, error, clearPackIfStaleForMskDate, afterOpenBlister, resetAllProgress],
  );

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState(): GameStateContextValue {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameState must be used within GameStateProvider");
  return ctx;
}
