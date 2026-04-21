import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "#f8fafc" : "#94a3b8",
  fontWeight: isActive ? 600 : 500,
  textDecoration: "none",
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  background: isActive ? "rgba(148, 163, 184, 0.15)" : "transparent",
});

export function NavBar() {
  return (
    <nav
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px max(12px, env(safe-area-inset-bottom))",
        borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
        position: "sticky",
        top: 0,
        backdropFilter: "blur(12px)",
        background: "rgba(15, 23, 42, 0.85)",
        zIndex: 10,
      }}
    >
      <NavLink to="/" end style={linkStyle}>
        Блистер
      </NavLink>
      <NavLink to="/collection" style={linkStyle}>
        Коллекция
      </NavLink>
    </nav>
  );
}
