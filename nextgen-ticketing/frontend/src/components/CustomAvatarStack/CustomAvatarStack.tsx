import React from "react";
import styles from "./CustomAvatarStack.module.css";
import CustomImage from "../CustomImage";

import type { CustomAvatarStackProps } from "../types";

const CustomAvatarStack: React.FC<CustomAvatarStackProps> = ({
  items = [],
  limit = 4,
  size = 28,
  className = "",
}) => {
  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, limit);
  const remainingCount = items.length - limit;

  return (
    <div className={`${styles.stack} ${className}`} style={{ height: size }}>
      {visibleItems.map((item, idx) => (
        <div
          key={item.id}
          className={styles.avatar}
          style={{
            width: size,
            height: size,
            marginLeft: idx === 0 ? 0 : -(size * 0.35),
            zIndex: visibleItems.length - idx,
            fontSize: `${size * 0.4}px`,
          }}
          title={item.name}
        >
          {item.image ? (
            <CustomImage
              src={item.image}
              alt={item.name}
              borderRadius="50%"
              showSkeleton={false}
            />
          ) : (
            item.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`${styles.avatar} ${styles.more}`}
          style={{
            width: size,
            height: size,
            marginLeft: -(size * 0.35),
            fontSize: `${size * 0.35}px`,
            zIndex: 0,
          }}
          title={`${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default CustomAvatarStack;
