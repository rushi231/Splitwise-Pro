import { useState } from "react";
import { Modal } from "./Modal";
import formStyles from "../styles/form.module.css";

export function AddMemberModal({ onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) return setError("Enter an email address.");

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add member" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className={formStyles.error}>{error}</p>}

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="memberEmail">
            Member's email
          </label>
          <input
            id="memberEmail"
            className={formStyles.input}
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <button className={formStyles.primaryButton} disabled={submitting}>
          {submitting ? "Adding..." : "Add member"}
        </button>
      </form>
    </Modal>
  );
}