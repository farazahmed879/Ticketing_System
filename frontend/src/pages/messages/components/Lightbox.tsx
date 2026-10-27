import React from "react";
import { createPortal } from "react-dom";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomImage from "../../../components/CustomImage";

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, index, onClose }) => {
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
      <CustomImage
        src={images[index]}
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
