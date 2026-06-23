import React from "react";
import styles from "./CustomTooltip.module.css";

interface CustomTooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  text,
  children,
  className = "",
  style,
}) => (
  <span
    className={`${styles.wrapper} ${className}`}
    data-tooltip={text}
    style={style}
  >
    {children}
  </span>
);

export default CustomTooltip;
