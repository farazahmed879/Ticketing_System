import React, { useState, useEffect, useRef } from "react";
import styles from "./CustomImage.module.css";

import type { CustomImageProps } from "../types";

const CustomImage: React.FC<CustomImageProps> = ({
  src,
  alt,
  fallback = "/placeholder-avatar.png",
  containerStyle,
  borderRadius,
  showSkeleton = true,
  className = "",
  style,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (src) {
      setError(false);
      // Data URLs and cached images can finish loading before React attaches
      // the onLoad handler — if the browser already has the image, don't wait
      // for a load event that will never fire.
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setLoading(false);
      } else {
        setLoading(true);
      }
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
      className={`${styles.container} ${className}`}
      style={{
        ...(borderRadius !== undefined ? { borderRadius } : {}),
        ...containerStyle,
      }}
    >
      {loading && showSkeleton && <div className={styles.skeleton} />}
      <img
        ref={imgRef}
        src={error || !src ? fallback : src}
        alt={alt || "Image"}
        onLoad={handleLoad}
        onError={handleError}
        className={`${styles.image} ${loading ? styles.hidden : ""}`}
        style={{
          ...(borderRadius !== undefined ? { borderRadius } : {}),
          ...style,
        }}
        {...props}
      />
    </div>
  );
};

export default CustomImage;
