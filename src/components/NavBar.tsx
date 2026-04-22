import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function NavBar() {
  const { user } = useAuth();
  const shortEmail = user?.email ? (user.email.length > 22 ? `${user.email.slice(0, 20)}…` : user.email) : "";

  return (
    <nav className="wb-nav">
      <NavLink to="/" end className={({ isActive }) => `wb-nav-link${isActive ? " wb-nav-link--active" : ""}`}>
        Блистер
      </NavLink>
      <NavLink to="/collection" className={({ isActive }) => `wb-nav-link${isActive ? " wb-nav-link--active" : ""}`}>
        Коллекция
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `wb-nav-link${isActive ? " wb-nav-link--active" : ""}`}>
        Профиль
      </NavLink>
      {shortEmail && (
        <span className="wb-nav-email" title={user?.email ?? undefined}>
          {shortEmail}
        </span>
      )}
    </nav>
  );
}
