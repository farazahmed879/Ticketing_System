import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomImage from "../../../components/CustomImage";

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
}

const navBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  padding: 0,
};

const Lightbox: React.FC<LightboxProps> = ({ images, index, onClose }) => {
  // Callers mount a fresh Lightbox per open, so `index` is only the start.
  const [current, setCurrent] = useState(index);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setCurrent((i) => (i + delta + count) % count),
    [count],
  );

  // Keyboard: Esc closes, arrows move between images.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (count > 1 && e.key === "ArrowRight") step(1);
      else if (count > 1 && e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, step, onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <CustomButton
        variant="ghost"
        onClick={onClose}
        title="Close"
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          color: "white",
          padding: 0,
        }}
        icon={<CustomIcon name="X" size={24} />}
      />
      {count > 1 && (
        <>
          <CustomButton
            variant="ghost"
            title="Previous"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            style={{ ...navBtnStyle, left: 20 }}
            icon={<CustomIcon name="ChevronLeft" size={26} />}
          />
          <CustomButton
            variant="ghost"
            title="Next"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            style={{ ...navBtnStyle, right: 20 }}
            icon={<CustomIcon name="ChevronRight" size={26} />}
          />
          <span
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "0.85rem",
              opacity: 0.85,
            }}
          >
            {current + 1} / {count}
          </span>
        </>
      )}
      <CustomImage
        src={images[current]}
        alt="attachment"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 8,
        }}
      />
    </div>,
    document.body
  );
};

export default Lightbox;
