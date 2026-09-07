import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";
import formStyles from "../styles/form.module.css";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    setSubmitting(true);
    try {
      await signup(email, password, displayName);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>S</span>
          Splitwise Pro
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className={formStyles.error}>{error}</p>}

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="displayName">
              Name
            </label>
            <input
              id="displayName"
              className={formStyles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={formStyles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={formStyles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}