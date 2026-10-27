import React from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😄", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍",
      "😘", "😋", "😜", "🤪", "🤗", "🤔", "😐", "😏", "🙄", "😴",
      "😅", "😬", "🥹", "🥺", "😢", "😭", "😤", "😠", "🤯", "😱",
      "🥳", "🤩", "😎", "🤓", "🫡", "🤝", "🙏", "💪", "🫶", "🤞",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤙", "👏", "🙌", "👋", "🤚", "✋",
      "👉", "👈", "👆", "👇", "☝️", "✊", "👊", "🤛", "🤜", "💅",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
    ],
  },
  {
    label: "Celebration",
    emojis: [
      "🎉", "🎊", "🥂", "🍾", "🎈", "🎂", "🍰", "🎁", "🏆", "🥇",
      "🌟", "⭐", "✨", "🔥", "💯", "🚀", "🎯", "🏅", "🎖️", "👑",
    ],
  },
  {
    label: "Work",
    emojis: [
      "💻", "🖥️", "📱", "📞", "📧", "📅", "📌", "📎", "✅", "❌",
      "⚠️", "❓", "❗", "💡", "📝", "🔍", "🐛", "⏰", "☕", "🍕",
    ],
  },
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  return (
    <div
      className="glass-card"
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: 0,
        width: 320,
        maxHeight: 300,
        overflowY: "auto",
        padding: 12,
        borderRadius: 14,
        zIndex: 200,
        background: "var(--bg-card)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
      }}
    >
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--text-muted)",
              margin: "4px 2px 6px",
            }}
          >
            {cat.label}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 2,
            }}
          >
            {cat.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelect(emoji)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  lineHeight: "30px",
                  cursor: "pointer",
                  borderRadius: 8,
                  padding: 0,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(124,58,237,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmojiPicker;
