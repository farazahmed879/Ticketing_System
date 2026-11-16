import CustomIcon from "../../../components/CustomIcon";
import styles from "../TicketList.module.css";

interface ListAndKanbanSwitcherProps {
  navigate: (path: string) => void;
  selectedValue: "list" | "grid" | "board";
}

const ListAndKanbanSwitcher: React.FC<ListAndKanbanSwitcherProps> = ({
  navigate,
  selectedValue,
}) => {
  const activeStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 6,
    background: "var(--accent-primary)",
    color: "#fff",
    border: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "default",
  };

  const inactiveStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 6,
    background: "transparent",
    color: "var(--text-secondary)",
    border: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <>
      <div
        className={`view-mode-switcher ${styles.viewSwitch}`}
        style={{
          display: "flex",
          background: "var(--bg-card)",
          padding: 4,
          borderRadius: 8,
          border: "1px solid var(--border-glass)",
        }}
      >
        <button
          onClick={() =>
            selectedValue !== "list" && navigate("/tickets?view=list")
          }
          style={selectedValue === "list" ? activeStyle : inactiveStyle}
          aria-label="List view"
          title="List view"
        >
          <CustomIcon name="List" size={16} />{" "}
          <span className={styles.viewSwitchLabel}>List</span>
        </button>
        <button
          onClick={() =>
            selectedValue !== "grid" && navigate("/tickets?view=grid")
          }
          style={selectedValue === "grid" ? activeStyle : inactiveStyle}
          aria-label="Grid view"
          title="Grid view"
        >
          <CustomIcon name="LayoutGrid" size={16} />{" "}
          <span className={styles.viewSwitchLabel}>Grid</span>
        </button>
        <button
          onClick={() =>
            selectedValue !== "board" && navigate("/tickets/board")
          }
          style={selectedValue === "board" ? activeStyle : inactiveStyle}
          aria-label="Board view"
          title="Board view"
        >
          <CustomIcon name="Kanban" size={16} />{" "}
          <span className={styles.viewSwitchLabel}>Board</span>
        </button>
      </div>
    </>
  );
};

export default ListAndKanbanSwitcher;
