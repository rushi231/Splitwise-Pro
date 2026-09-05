import styles from "./BalanceCards.module.css";
import { formatCents } from "../utils/format";


export function BalanceCards({ balances, members, currentUserId, currency }) {
  if (!balances || !members) return null;

  const nameFor = (userId) => members.find((m) => m.userId === userId)?.displayName ?? "Someone";

  // Show every member who has a balance, current user first.
  const rows = Object.entries(balances)
    .map(([userId, netCents]) => ({ userId, netCents }))
    .sort((a, b) => (a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0));

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Balances</p>
      {rows.map(({ userId, netCents }) => {
        const isYou = userId === currentUserId;
        const amountClass = netCents > 0 ? styles.owed : netCents < 0 ? styles.owe : styles.settled;
        return (
          <div key={userId} className={isYou ? styles.rowYou : styles.row}>
            <span className={styles.name}>{isYou ? "You" : nameFor(userId)}</span>
            <span className={`${styles.amount} ${amountClass}`}>
              {netCents === 0
                ? "settled up"
                : `${netCents > 0 ? "+" : "-"}${formatCents(Math.abs(netCents), currency)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}