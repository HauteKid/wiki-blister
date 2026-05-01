import { useMemo, useState } from "react";
import { CardLightbox } from "../components/CardLightbox";
import { CardTile } from "../components/CardTile";
import { useAuth } from "../context/AuthContext";
import { useGameState } from "../context/GameStateContext";
import { canBypassDailyBlisterLimit } from "../lib/blisterAdmin";
import type { WikiCard } from "../types";

type CollectionTab = "all" | "favorites";

export function CollectionPage() {
  const { user } = useAuth();
  const isBlisterAdmin = useMemo(() => canBypassDailyBlisterLimit(user?.email), [user?.email]);
  const { collection, error } = useGameState();
  const [zoomed, setZoomed] = useState<WikiCard | null>(null);
  const [tab, setTab] = useState<CollectionTab>("all");

  const favorites = useMemo(() => collection.filter((c) => c.favorite === true), [collection]);
  const displayed = tab === "all" ? collection : favorites;

  if (error && collection.length === 0) {
    return (
      <div className="wb-page">
        <h1 className="wb-h1">Коллекция</h1>
        <p className="wb-status-err" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className="wb-page">
        <h1 className="wb-h1">Коллекция</h1>
        <p className="wb-lead">Пока пусто. Открой блистер на главной — карточки появятся здесь.</p>
      </div>
    );
  }

  return (
    <div className="wb-page">
      <h1 className="wb-h1">Коллекция</h1>

      <div className="wb-tabs" role="tablist" aria-label="Разделы коллекции">
        <button
          type="button"
          role="tab"
          id="collection-tab-all"
          aria-selected={tab === "all"}
          aria-controls="collection-panel"
          className={`wb-tab${tab === "all" ? " wb-tab--active" : ""}`}
          onClick={() => setTab("all")}
        >
          Все
          <span className="wb-tab__count">{collection.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="collection-tab-favorites"
          aria-selected={tab === "favorites"}
          aria-controls="collection-panel"
          className={`wb-tab${tab === "favorites" ? " wb-tab--active" : ""}`}
          onClick={() => setTab("favorites")}
        >
          Избранное
          <span className="wb-tab__count">{favorites.length}</span>
        </button>
      </div>

      <p className="wb-muted" style={{ margin: "12px 0 20px", fontSize: "1rem" }}>
        {tab === "all"
          ? `Всего карточек: ${collection.length}`
          : `В избранном: ${favorites.length} из ${collection.length}`}
      </p>
      {error && (
        <p className="wb-status-err" role="alert">
          {error}
        </p>
      )}

      <div
        id="collection-panel"
        role="tabpanel"
        aria-labelledby={tab === "all" ? "collection-tab-all" : "collection-tab-favorites"}
      >
        {displayed.length === 0 ? (
          <p className="wb-lead" style={{ marginTop: 0 }}>
            Здесь появятся карточки, отмеченные закладкой в полноэкранном просмотре.
          </p>
        ) : (
          <div className="wb-card-grid">
            {displayed.map((c) => (
              <CardTile
                key={c.pageid}
                card={c}
                onActivate={() => setZoomed(c)}
                showAdminRarityAudit={isBlisterAdmin}
              />
            ))}
          </div>
        )}
      </div>
      <CardLightbox card={zoomed} onClose={() => setZoomed(null)} showAdminRarityAudit={isBlisterAdmin} />
    </div>
  );
}
