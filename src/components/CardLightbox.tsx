import { useEffect } from "react";
import type { WikiCard } from "../types";
import { CardTile } from "./CardTile";

type Props = {
  card: WikiCard | null;
  onClose: () => void;
};

export function CardLightbox({ card, onClose }: Props) {
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

  if (!card) return null;

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
        <CardTile card={card} variant="zoom" />
      </div>
    </div>
  );
}
