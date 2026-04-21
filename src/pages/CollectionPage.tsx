import { useSyncExternalStore } from "react";
import { CardTile } from "../components/CardTile";
import { loadCollection } from "../lib/storage";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("wiki-blister-updated", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("wiki-blister-updated", cb);
  };
}

function getSnapshot() {
  return loadCollection();
}

export function CollectionPage() {
  const collection = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

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
