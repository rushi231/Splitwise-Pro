import { useState } from "react";
import { Modal } from "./Modal";
import formStyles from "../styles/form.module.css";

export function NewGroupModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return setError("Enter a group name.");

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), defaultCurrency });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className={formStyles.error}>{error}</p>}

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="groupName">
            Group name
          </label>
          <input
            id="groupName"
            className={formStyles.input}
            placeholder="Roommates, Japan trip..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="groupCurrency">
            Default currency
          </label>
          <select
            id="groupCurrency"
            className={formStyles.select}
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>

        <button className={formStyles.primaryButton} disabled={submitting}>
          {submitting ? "Creating..." : "Create group"}
        </button>
      </form>
    </Modal>
  );
}