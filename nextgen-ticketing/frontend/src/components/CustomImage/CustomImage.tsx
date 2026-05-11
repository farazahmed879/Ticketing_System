import React, { useState, useEffect } from "react";
import styles from "./CustomImage.module.css";

import type { CustomImageProps } from "../types";

const CustomImage: React.FC<CustomImageProps> = ({
  src,
  alt,
  fallback = "/placeholder-avatar.png",
  containerStyle,
  borderRadius = "8px",
  showSkeleton = true,
  className = "",
  style,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (src) {
      setLoading(true);
      setError(false);
    }
  }, [src]);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div
      className={styles.container}
      style={{
        ...containerStyle,
        borderRadius: borderRadius,
      }}
    >
      {loading && showSkeleton && <div className={styles.skeleton} />}
      <img
        src={error || !src ? fallback : src}
        alt={alt || "Image"}
        onLoad={handleLoad}
        onError={handleError}
        className={`${styles.image} ${loading ? styles.hidden : ""} ${className}`}
        style={{
          ...style,
          borderRadius: borderRadius,
        }}
        {...props}
      />
    </div>
  );
};

export default CustomImage;
