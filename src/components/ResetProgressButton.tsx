import { useState } from "react";
import { useGameState } from "../context/GameStateContext";

export function ResetProgressButton() {
  const { resetAllProgress } = useGameState();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="wb-btn wb-btn--danger"
      onClick={() => {
        if (
          !window.confirm(
            "Сбросить всё: коллекция и сегодняшний блистер? Отменить это действие нельзя.",
          )
        ) {
          return;
        }
        setBusy(true);
        void (async () => {
          try {
            await resetAllProgress();
          } catch {
            window.alert("Не удалось сбросить. Проверьте сеть и попробуйте снова.");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {busy ? "Сброс…" : "Сбросить весь прогресс"}
    </button>
  );
}
