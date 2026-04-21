import { useEffect, useState } from "react";
import { CardTile } from "../components/CardTile";
import { loadCollection } from "../lib/storage";

export function CollectionPage() {
  const [collection, setCollection] = useState(() => loadCollection());

  useEffect(() => {
    const sync = () => setCollection(loadCollection());
    window.addEventListener("storage", sync);
    window.addEventListener("wiki-blister-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wiki-blister-updated", sync);
    };
  }, []);

  if (collection.length === 0) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 24, color: "#f8fafc" }}>Коллекция</h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 16 }}>
          Пока пусто. Открой блистер на главной — карточки появятся здесь.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, color: "#f8fafc" }}>Коллекция</h1>
      <p style={{ margin: "0 0 20px", color: "#94a3b8" }}>Всего карточек: {collection.length}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {collection.map((c) => (
          <CardTile key={c.pageid} card={c} compact />
        ))}
      </div>
    </div>
  );
}
