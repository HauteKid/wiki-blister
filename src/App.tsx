import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { BlisterPage } from "./pages/BlisterPage";
import { CollectionPage } from "./pages/CollectionPage";

export default function App() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<BlisterPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Routes>
      </main>
    </div>
  );
}
