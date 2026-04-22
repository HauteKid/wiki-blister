import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AppShell } from "./layout/AppShell";
import { BlisterPage } from "./pages/BlisterPage";
import { CollectionPage } from "./pages/CollectionPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
  return (
    <AuthProvider>
      <div className="wb-app wb-app--bg-energy">
        {/* Слой поверх фона и noise (::before), иначе в части браузеров контент может не попасть в отрисовку */}
        <div className="wb-app-surface">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<BlisterPage />} />
                <Route path="/collection" element={<CollectionPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
