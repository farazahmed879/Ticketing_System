import { useEffect, useRef, useState } from "react";
import CustomIcon from "../../../../components/CustomIcon";

interface CustomDropdownMenuProps {
  items: Array<{
    label: string;
    icon: string;
    onClick: () => void;
    danger?: boolean;
  }>;
}

const CustomDropdownMenu: React.FC<CustomDropdownMenuProps> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="glass-card"
        style={{
          border: "1px solid var(--border-glass)",
          padding: 8,
          borderRadius: 8,
          cursor: "pointer",
          background: "transparent",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CustomIcon name="MoreVertical" size={18} />
      </button>
      {open && (
        <div
          className="glass-card"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            zIndex: 1000,
            minWidth: 160,
            padding: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            border: "1px solid var(--border-glass)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: item.danger
                  ? "var(--accent-danger)"
                  : "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <CustomIcon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdownMenu;
