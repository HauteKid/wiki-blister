import { useState } from "react";
import { CardLightbox } from "../components/CardLightbox";
import { CardTile } from "../components/CardTile";
import { useGameState } from "../context/GameStateContext";
import type { WikiCard } from "../types";

export function CollectionPage() {
  const { collection, error } = useGameState();
  const [zoomed, setZoomed] = useState<WikiCard | null>(null);

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
      <p className="wb-muted" style={{ margin: "0 0 20px", fontSize: "1rem" }}>
        Всего карточек: {collection.length}
      </p>
      {error && (
        <p className="wb-status-err" role="alert">
          {error}
        </p>
      )}
      <div className="wb-card-grid">
        {collection.map((c) => (
          <CardTile key={c.pageid} card={c} onActivate={() => setZoomed(c)} />
        ))}
      </div>
      <CardLightbox card={zoomed} onClose={() => setZoomed(null)} />
    </div>
  );
}
