import type { CSSProperties } from "react";
import type { CardRarity, WikiCard } from "../types";
import { normalizeRarity, RARITY_LABEL } from "../lib/rarity";

type Variant = "grid" | "zoom";

type Props = {
  card: WikiCard;
  /** Сетка (по умолчанию) или крупный вид в lightbox */
  variant?: Variant;
  onActivate?: () => void;
};

function rarityClass(r: CardRarity): string {
  return `wb-tcg--${r}`;
}

export function CardTile({ card, variant = "grid", onActivate }: Props) {
  const rarity = normalizeRarity(card.rarity);
  const interactive = Boolean(onActivate) && variant === "grid";

  return (
    <article
      className={`wb-tcg ${rarityClass(rarity)}${variant === "zoom" ? " wb-tcg--zoom" : ""}`}
      style={{ "--wb-tcg-rarity": rarity } as CSSProperties}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Открыть карточку: ${card.title}` : undefined}
    >
      <div className="wb-tcg__frame">
        <span className="wb-tcg__wiki-badge" title="Википедия" aria-hidden>
          W
        </span>
        <span className={`wb-tcg__rarity-pill wb-tcg__rarity-pill--${rarity}`}>{RARITY_LABEL[rarity]}</span>

        <div className="wb-tcg__art">
          {card.thumbnailUrl ? (
            <img src={card.thumbnailUrl} alt="" loading="lazy" className="wb-tcg__img" />
          ) : (
            <div className="wb-tcg__art-placeholder">Нет иллюстрации</div>
          )}
        </div>

        <div className="wb-tcg__ribbon">
          <h2 className="wb-tcg__title">{card.title}</h2>
        </div>

        <div className="wb-tcg__textbox">
          <p className="wb-tcg__extract">{card.extract}</p>
          <span className="wb-tcg__tag">Википедия</span>
        </div>

        <span className={`wb-tcg__gem wb-tcg__gem--${rarity}`} aria-hidden />

        <a
          className="wb-tcg__link"
          href={card.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Читать статью →
        </a>
      </div>
    </article>
  );
}
