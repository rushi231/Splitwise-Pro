import styles from "./ExpenseList.module.css";
import { formatCents, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export function ExpenseList({ expenses, members, onDelete }) {
  const { user } = useAuth();
  const nameFor = (userId) => members?.find((m) => m.userId === userId)?.displayName ?? "Someone";

  if (expenses.length === 0) {
    return (
      <div className={styles.list}>
        <p className={styles.empty}>No expenses yet. Add the first one for this group.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} currentUserId={user?.id} nameFor={nameFor} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ExpenseRow({ expense, currentUserId, nameFor, onDelete }) {
  const amountCents = expense.convertedAmountCents ?? expense.totalAmountCents;
  const currency = expense.convertedCurrency ?? expense.currency;
  const splits = expense.convertedSplits ?? expense.splits ?? [];

  // Your share what you owe on this expense, netted against what you paid.
  const yourSplit = splits.find((s) => s.userId === currentUserId)?.amountCents ?? 0;
  const youPaid = expense.paidBy === currentUserId ? amountCents : 0;
  const yourShareCents = youPaid - yourSplit;

  return (
    <div className={styles.row}>
      <div className={styles.icon}>{expense.description?.[0]?.toUpperCase() || "?"}</div>
      <div className={styles.body}>
        <p className={styles.description}>{expense.description}</p>
        <p className={styles.meta}>
          Paid by {expense.paidBy === currentUserId ? "you" : nameFor(expense.paidBy)} · {formatDate(expense.createdAt)}
        </p>
      </div>
      <div className={styles.amounts}>
        <p className={styles.amount}>{formatCents(amountCents, currency)}</p>
        {yourShareCents !== 0 && (
          <p className={`${styles.share} ${yourShareCents > 0 ? styles.shareOwed : styles.shareOwe}`}>
            {yourShareCents > 0 ? "you get " : "you owe "}
            {formatCents(Math.abs(yourShareCents), currency)}
          </p>
        )}
      </div>
      {onDelete && (
        <button className={styles.deleteButton} onClick={() => onDelete(expense.id)} aria-label={`Delete ${expense.description}`}>
          Delete
        </button>
      )}
    </div>
  );
}