import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";
import formStyles from "../styles/form.module.css";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.status === 401 ? "Incorrect email or password." : err.message);
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
            <label className={formStyles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={formStyles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
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
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}