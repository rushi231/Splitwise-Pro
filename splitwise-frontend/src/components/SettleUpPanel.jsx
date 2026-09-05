import styles from "./SettleUpPanel.module.css";
import { formatCents } from "../utils/format";
import { useAuth } from "../context/AuthContext";


export function SettleUpPanel({ suggestions, members, currency, onRecordPayment }) {
  const { user } = useAuth();

  if (!suggestions || suggestions.length === 0) return null;

  const nameFor = (userId) => members?.find((m) => m.userId === userId)?.displayName ?? "Someone";

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Suggested settlements</p>
      {suggestions.map((s, i) => (
        <div className={styles.row} key={i}>
          <span className={styles.text}>
            {s.fromUserId === user?.id ? "You" : nameFor(s.fromUserId)} pay
            {s.fromUserId === user?.id ? "" : "s"} {s.toUserId === user?.id ? "you" : nameFor(s.toUserId)}{" "}
            {formatCents(s.amountCents, currency)}
          </span>
          {s.fromUserId === user?.id && (
            <button
              className={styles.recordButton}
              onClick={() => onRecordPayment({ ...s, currency })}
            >
              Mark as paid
            </button>
          )}
        </div>
      ))}
    </div>
  );
}