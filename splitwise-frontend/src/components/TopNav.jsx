import { useAuth } from "../context/AuthContext";
import styles from "./TopNav.module.css";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TopNav() {
  const { user, logout } = useAuth();

  return (
    <header className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.mark}>S</span>
        Splitwise Pro
      </div>
      <div className={styles.right}>
        <button className={styles.userButton} onClick={logout}>
          <span className={styles.avatar}>{initials(user?.displayName)}</span>
          {user?.displayName}
        </button>
      </div>
    </header>
  );
}