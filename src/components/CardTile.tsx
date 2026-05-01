import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import type { CardRarity, WikiCard } from "../types";
import { CATEGORY_LABEL, normalizeCardCategory } from "../lib/cardCategory";
import { fetchAdminRarityExplanation } from "../lib/rarityExplain";
import { normalizeRarity, RARITY_LABEL } from "../lib/rarity";

type Variant = "grid" | "zoom";

type Props = {
  card: WikiCard;
  /** Сетка (по умолчанию) или крупный вид в lightbox */
  variant?: Variant;
  onActivate?: () => void;
  /** Админ: при наведении показать, из чего складывается редкость */
  showAdminRarityAudit?: boolean;
};

function rarityClass(r: CardRarity): string {
  return `wb-tcg--${r}`;
}

export function CardTile({ card, variant = "grid", onActivate, showAdminRarityAudit = false }: Props) {
  const rarity = normalizeRarity(card.rarity);
  const category = normalizeCardCategory(card.category);
  const interactive = Boolean(onActivate) && variant === "grid";
  const [auditText, setAuditText] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const auditReq = useRef(0);

  const runAudit = () => {
    if (!showAdminRarityAudit) return;
    const id = ++auditReq.current;
    setAuditLoading(true);
    setAuditText(null);
    void fetchAdminRarityExplanation(card)
      .then((t) => {
        if (auditReq.current === id) {
          setAuditText(t);
          setAuditLoading(false);
        }
      })
      .catch(() => {
        if (auditReq.current === id) {
          setAuditText("Не удалось загрузить пояснение (сеть или API).");
          setAuditLoading(false);
        }
      });
  };

  const clearAudit = () => {
    auditReq.current += 1;
    setAuditLoading(false);
    setAuditText(null);
  };

  return (
    <div
      className={`wb-tcg-hover-wrap${showAdminRarityAudit ? " wb-tcg-hover-wrap--audit" : ""}`}
      onMouseEnter={showAdminRarityAudit ? runAudit : undefined}
      onMouseLeave={showAdminRarityAudit ? clearAudit : undefined}
    >
      {showAdminRarityAudit && (auditLoading || auditText) && (
        <div className="wb-tcg__audit-tip" role="status">
          {auditLoading && !auditText ? "Считаем редкость…" : auditText}
        </div>
      )}
      <article
        className={`wb-tcg ${rarityClass(rarity)}${variant === "zoom" ? " wb-tcg--zoom" : ""}${
          showAdminRarityAudit ? " wb-tcg--admin-audit" : ""
        }`}
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
          <span className={`wb-tcg__category-pill wb-tcg__category-pill--${category}`}>
            {CATEGORY_LABEL[category]}
          </span>
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
    </div>
  );
}
