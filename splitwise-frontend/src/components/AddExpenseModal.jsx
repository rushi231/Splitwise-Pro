import { useState } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import formStyles from "../styles/form.module.css";

// Splits the expense equally among all group members. Because integer cents
// don't always divide evenly (e.g. $10.00 / 3), any leftover cents go to the
// first member so the split always sums exactly to the total - this mirrors
// the "splits must sum to total" validation the backend enforces.
function computeEqualSplits(totalCents, memberIds) {
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;
  return memberIds.map((userId, index) => ({
    userId,
    amountCents: base + (index === 0 ? remainder : 0),
  }));
}

export function AddExpenseModal({ members, defaultCurrency, onClose, onSubmit }) {
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || "USD");
  const [paidBy, setPaidBy] = useState(user?.id || "");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const totalCents = Math.round(parseFloat(amount) * 100);
    if (!description.trim()) return setError("Enter a description.");
    if (!Number.isFinite(totalCents) || totalCents <= 0) return setError("Enter a valid amount.");
    if (!paidBy) return setError("Choose who paid.");

    setSubmitting(true);
    try {
      const splits = computeEqualSplits(
        totalCents,
        members.map((m) => m.userId),
      );
      await onSubmit({
        description: description.trim(),
        totalAmountCents: totalCents,
        currency,
        paidBy,
        splits,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className={formStyles.error}>{error}</p>}

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="description">
            Description
          </label>
          <input
            id="description"
            className={formStyles.input}
            placeholder="Groceries, rent, taxi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              className={formStyles.input}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className={formStyles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="paidBy">
            Paid by
          </label>
          <select
            id="paidBy"
            className={formStyles.select}
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>

        <p className={formStyles.label} style={{ marginBottom: "var(--space-4)" }}>
          Split equally between all {members.length} members.
        </p>

        <button className={formStyles.primaryButton} disabled={submitting}>
          {submitting ? "Adding..." : "Add expense"}
        </button>
      </form>
    </Modal>
  );
}