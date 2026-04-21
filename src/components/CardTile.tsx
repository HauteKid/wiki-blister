import type { WikiCard } from "../types";

export function CardTile({ card, compact }: { card: WikiCard; compact?: boolean }) {
  return (
    <article
      style={{
        background: "rgba(30, 41, 59, 0.75)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(148, 163, 184, 0.15)",
        display: "flex",
        flexDirection: "column",
        minHeight: compact ? undefined : 280,
      }}
    >
      <div
        style={{
          aspectRatio: "16 / 9",
          background: "#1e293b",
          overflow: "hidden",
        }}
      >
        {card.thumbnailUrl ? (
          <img
            src={card.thumbnailUrl}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: 14,
              padding: 16,
              textAlign: "center",
            }}
          >
            Нет иллюстрации в статье
          </div>
        )}
      </div>
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: compact ? 16 : 18, lineHeight: 1.25, color: "#f1f5f9" }}>
          {card.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "#cbd5e1",
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 3 : 4,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {card.extract}
        </p>
        <a href={card.articleUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
          Читать в Википедии →
        </a>
      </div>
    </article>
  );
}
