import { useEffect, useRef, useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import { REACTIONS, getReaction } from "./feedTypes";
import styles from "./Feed.module.css";

interface ReactionButtonProps {
  myReaction: string | null;
  onReact: (type: string | null) => void;
}

/**
 * Facebook-style react button.
 * - Click: Like, or remove your current reaction.
 * - Hover (mouse) or long-press (touch): pick a specific reaction.
 */
const ReactionButton = ({ myReaction, onReact }: ReactionButtonProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const current = getReaction(myReaction);

  const schedule = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Close when tapping/clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (type: string) => {
    window.clearTimeout(timer.current);
    setOpen(false);
    onReact(type === myReaction ? null : type);
  };

  return (
    <div
      ref={wrapRef}
      className={styles.reactWrap}
      onMouseEnter={(e) => {
        if (e.nativeEvent instanceof MouseEvent) schedule(() => setOpen(true), 400);
      }}
      onMouseLeave={() => schedule(() => setOpen(false), 300)}
    >
      {open && (
        <div className={styles.picker} role="menu" aria-label="Reactions">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              title={r.label}
              aria-label={r.label}
              className={`${styles.pickerItem} ${
                r.type === myReaction ? styles.pickerItemActive : ""
              }`}
              onClick={() => pick(r.type)}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.actionBtn}
        style={current ? { color: current.color } : undefined}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          setOpen(false);
          onReact(myReaction ? null : "like");
        }}
        onTouchStart={() => {
          longPressed.current = false;
          schedule(() => {
            longPressed.current = true;
            setOpen(true);
          }, 450);
        }}
        onTouchEnd={() => {
          if (!longPressed.current) window.clearTimeout(timer.current);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {current ? (
          <span className={styles.actionEmoji}>{current.emoji}</span>
        ) : (
          <CustomIcon name="ThumbsUp" size={18} />
        )}
        {current ? current.label : "Like"}
      </button>
    </div>
  );
};

export default ReactionButton;
