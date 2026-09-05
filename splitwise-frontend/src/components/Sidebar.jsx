import styles from "./Sidebar.module.css";

export function Sidebar({ groups, selectedGroupId, onSelectGroup, onNewGroup }) {
  return (
    <nav className={styles.sidebar} aria-label="Groups">
      <p className={styles.label}>Groups</p>
      <div className={styles.list}>
        {groups.map((group) => (
          <button
            key={group.id}
            className={group.id === selectedGroupId ? styles.itemActive : styles.item}
            onClick={() => onSelectGroup(group.id)}
            aria-current={group.id === selectedGroupId}
          >
            {group.name}
          </button>
        ))}
      </div>
      <button className={styles.newGroupButton} onClick={onNewGroup}>
        + New group
      </button>
    </nav>
  );
}