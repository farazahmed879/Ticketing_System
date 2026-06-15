import React from "react";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface HighlightProps {
  text?: string | null;
  query?: string;
}

/**
 * Renders `text`, wrapping any case-insensitive occurrence of `query` in a
 * highlighted <mark>. Falls back to plain text when there's no query.
 */
const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
  const value = text ?? "";
  const term = query?.trim();
  if (!term) return <>{value}</>;

  const parts = value.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: "rgba(var(--primary-rgb), 0.32)",
              color: "inherit",
              borderRadius: 3,
              padding: "0 1px",
            }}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

export default Highlight;
