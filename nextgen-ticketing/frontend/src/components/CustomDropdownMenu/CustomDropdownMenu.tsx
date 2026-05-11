import React, { useState, useRef, useEffect } from "react";
import CustomButton from "../CustomButton";
import CustomIcon from "../CustomIcon";
import styles from "./CustomDropdownMenu.module.css";

export interface DropdownMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface CustomDropdownMenuProps {
  items: DropdownMenuItem[];
  triggerIcon?: string;
  triggerSize?: number;
  position?: "left" | "right";
  style?: React.CSSProperties;
}

const CustomDropdownMenu: React.FC<CustomDropdownMenuProps> = ({
  items,
  triggerIcon = "MoreVertical",
  triggerSize = 20,
  position = "right",
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item: DropdownMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={styles.container} style={style}>
      <CustomButton
        variant="ghost"
        size="sm"
        icon={
          <CustomIcon
            name={triggerIcon}
            size={triggerSize}
            color="var(--text-muted)"
          />
        }
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ padding: 8, borderRadius: 10 }}
      />
      {isOpen && (
        <div
          className={styles.menu}
          style={{
            [position === "right" ? "right" : "left"]: 0,
          }}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && <div className={styles.divider} />}
              <button
                className={`${styles.menuItem} ${item.danger ? styles.danger : ""}`}
                onClick={() => handleItemClick(item)}
              >
                {item.icon && <CustomIcon name={item.icon} size={16} />}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdownMenu;
