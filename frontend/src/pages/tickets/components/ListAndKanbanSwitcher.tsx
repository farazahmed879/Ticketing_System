import CustomIcon from "../../../components/CustomIcon";

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
        >
          <CustomIcon name="List" size={16} /> List
        </button>
        <button
          onClick={() =>
            selectedValue !== "grid" && navigate("/tickets?view=grid")
          }
          style={selectedValue === "grid" ? activeStyle : inactiveStyle}
        >
          <CustomIcon name="LayoutGrid" size={16} /> Grid
        </button>
        <button
          onClick={() =>
            selectedValue !== "board" && navigate("/tickets/board")
          }
          style={selectedValue === "board" ? activeStyle : inactiveStyle}
        >
          <CustomIcon name="Kanban" size={16} /> Board
        </button>
      </div>
    </>
  );
};

export default ListAndKanbanSwitcher;
