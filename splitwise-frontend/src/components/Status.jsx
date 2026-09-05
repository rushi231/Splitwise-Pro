import styles from "./Status.module.css";

export function Loading({ label = "Loading..." }) {
  return <p className={styles.state}>{label}</p>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <p className={styles.errorState}>
      {message}
      {onRetry && (
        <>
          {" "}
          <button
            onClick={onRetry}
            style={{ color: "inherit", textDecoration: "underline", background: "none", border: "none" }}
          >
            Retry
          </button>
        </>
      )}
    </p>
  );
}