import { useEffect, useMemo } from "react";
import type { WikiCard } from "../types";
import { useGameState } from "../context/GameStateContext";
import { CardTile } from "./CardTile";

type Props = {
  card: WikiCard | null;
  onClose: () => void;
  showAdminRarityAudit?: boolean;
};

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4z" />
    </svg>
  );
}

export function CardLightbox({ card, onClose, showAdminRarityAudit = false }: Props) {
  const { collection, todaysPack, setCardFavorite } = useGameState();

  const liveCard = useMemo(() => {
    if (!card) return null;
    return (
      collection.find((c) => c.pageid === card.pageid) ??
      todaysPack?.cards.find((c) => c.pageid === card.pageid) ??
      card
    );
  }, [card, collection, todaysPack]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [card, onClose]);

  if (!card || liveCard == null) return null;

  const isFavorite = liveCard.favorite === true;

  return (
    <div
      className="wb-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Увеличенная карточка"
      onClick={onClose}
    >
      <button type="button" className="wb-lightbox__close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <div className="wb-lightbox__inner" onClick={(e) => e.stopPropagation()}>
        <div className="wb-lightbox__toolbar">
          <button
            type="button"
            className={`wb-lightbox__favorite${isFavorite ? " wb-lightbox__favorite--on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              void setCardFavorite(liveCard.pageid, !isFavorite);
            }}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
            title={isFavorite ? "Убрать из избранного" : "В избранное"}
          >
            <BookmarkIcon filled={isFavorite} />
          </button>
        </div>
        <CardTile card={liveCard} variant="zoom" showAdminRarityAudit={showAdminRarityAudit} />
      </div>
    </div>
  );
}
