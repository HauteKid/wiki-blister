import { useNavigate } from "react-router-dom";
import { ResetProgressButton } from "../components/ResetProgressButton";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const email = user?.email ?? "";

  return (
    <div className="wb-page">
      <h1 className="wb-h1">Профиль</h1>
      <p className="wb-muted" style={{ margin: "0 0 6px" }}>
        Email
      </p>
      <p style={{ margin: "0 0 24px", fontSize: "1.05rem", fontWeight: 600, color: "var(--wb-text)", wordBreak: "break-all" }}>
        {email}
      </p>
      <p className="wb-lead" style={{ marginBottom: 8 }}>
        Коллекция и открытый блистер привязаны к этому аккаунту и синхронизируются между устройствами.
      </p>
      <ResetProgressButton />
      <button
        type="button"
        className="wb-btn wb-btn--secondary"
        style={{ marginTop: 20 }}
        onClick={() => {
          void (async () => {
            await signOut();
            navigate("/login", { replace: true });
          })();
        }}
      >
        Выйти
      </button>
    </div>
  );
}
