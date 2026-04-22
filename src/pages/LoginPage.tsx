import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="wb-page wb-page--auth">
        <p className="wb-muted">Загрузка…</p>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    void (async () => {
      const { error: err } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (err) setError(err.message);
    })();
  };

  return (
    <div className="wb-page wb-page--auth">
      <h1 className="wb-h1">Вход</h1>
      <p className="wb-lead" style={{ marginBottom: 24 }}>
        Нет аккаунта?{" "}
        <Link to="/register">Регистрация</Link>
      </p>
      <form onSubmit={onSubmit} className="wb-form">
        <label className="wb-form-label">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="wb-input"
          />
        </label>
        <label className="wb-form-label">
          <span>Пароль</span>
          <PasswordInput autoComplete="current-password" required value={password} onChange={setPassword} />
        </label>
        {error && (
          <p className="wb-status-err" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className="wb-btn wb-btn--primary wb-btn--block" style={{ marginTop: 8 }}>
          {submitting ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
