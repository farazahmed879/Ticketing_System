import React from "react";

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
            width: 60,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/InsigniaStandalone.svg"
            alt="Loading..."
            style={{ width: 48, height: 48 }}
            className="animate-pulse"
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
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .6; transform: scale(0.9); }
          }
          .animate-spin {
            animation: spin 2s linear infinite;
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
    </div>
  );
};

export default FullScreenLoader;
