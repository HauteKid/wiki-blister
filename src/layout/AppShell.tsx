import { Outlet } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import { GameStateProvider, useGameState } from "../context/GameStateContext";

function GameStateReady({ children }: { children: React.ReactNode }) {
  const { loading } = useGameState();
  if (loading) {
    return (
      <div className="wb-page">
        <p className="wb-muted">Загрузка коллекции…</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppShell() {
  return (
    <GameStateProvider>
      <NavBar />
      <main className="wb-main">
        <GameStateReady>
          <Outlet />
        </GameStateReady>
      </main>
    </GameStateProvider>
  );
}
