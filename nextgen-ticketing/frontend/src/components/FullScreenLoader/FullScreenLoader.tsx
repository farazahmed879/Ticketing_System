import React from "react";
import CustomIcon from "../CustomIcon";

import type { FullScreenLoaderProps } from "../types";

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  subMessage = "Ticketing System",
}) => {
  const message = "Jami Partners";
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Animated Rings */}
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "var(--accent-primary)",
            animation: "spin 1.5s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderBottomColor: "var(--accent-secondary)",
            animation: "spin 1s linear infinite reverse",
          }}
        />

        {/* Logo/Icon */}
        <div
          style={{
            background: "var(--bg-card)",
            width: 60,
            height: 60,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glass)",
            border: "1px solid var(--border-glass)",
          }}
        >
          <CustomIcon
            name="Loader2"
            size={32}
            className="animate-spin"
            color="var(--accent-primary)"
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            marginBottom: 8,
            color: "forestgreen",
          }}
        >
          {message}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          {subMessage}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 2s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default FullScreenLoader;
