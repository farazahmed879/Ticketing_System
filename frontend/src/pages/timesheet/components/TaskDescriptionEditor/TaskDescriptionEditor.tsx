import React, { useRef, useState, useEffect, useCallback } from "react";
import { Controller } from "react-hook-form";
import CustomIcon from "../../../../components/CustomIcon";
import CustomButton from "../../../../components/CustomButton";
import type { FieldValues } from "react-hook-form";
import type {
  TaskDescriptionEditorProps,
  FormattingActionType,
  EditorHistoryEntry,
} from "./types";
import {
  TASK_EDITOR_TOOLBAR,
  TASK_EDITOR_HISTORY_ACTIONS,
  TASK_EDITOR_DEFAULTS,
} from "./constants";
import styles from "./TaskDescriptionEditor.module.css";

export function TaskDescriptionEditor<TFieldValues extends FieldValues = any>({
  name,
  control,
  disabled = false,
  placeholder = TASK_EDITOR_DEFAULTS.DEFAULT_PLACEHOLDER,
  required = false,
  error: manualError,
  className = "",
}: TaskDescriptionEditorProps<TFieldValues>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isUndoRedoRef = useRef(false);
  const historyRef = useRef<EditorHistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Auto-resize textarea height within configured min/max bounds
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextH = Math.min(
      Math.max(el.scrollHeight, TASK_EDITOR_DEFAULTS.MIN_HEIGHT),
      TASK_EDITOR_DEFAULTS.MAX_HEIGHT
    );
    el.style.height = `${nextH}px`;
  }, []);

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Push a new snapshot to the history stack
  const pushSnapshot = useCallback((newText: string, cursor: number) => {
    const currentHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    const lastEntry = currentHistory[currentHistory.length - 1];

    if (lastEntry && lastEntry.text === newText) {
      lastEntry.cursor = cursor;
      return;
    }

    currentHistory.push({ text: newText, cursor });
    if (currentHistory.length > TASK_EDITOR_DEFAULTS.MAX_HISTORY_STACK) {
      currentHistory.shift();
    }

    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Perform Undo
  const handleUndo = useCallback(
    (currentValue: string, onChange: (val: string) => void) => {
      const textarea = textareaRef.current;
      const currentCursor = textarea?.selectionStart ?? currentValue.length;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // If there are unsaved text changes since the last snapshot, commit them first
      const currentEntry = historyRef.current[historyIndexRef.current];
      if (!currentEntry || currentEntry.text !== currentValue) {
        const nextHistory = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        );
        nextHistory.push({ text: currentValue, cursor: currentCursor });
        historyRef.current = nextHistory;
        historyIndexRef.current = nextHistory.length - 1;
      }

      if (historyIndexRef.current <= 0) return;

      const targetIndex = historyIndexRef.current - 1;
      const targetEntry = historyRef.current[targetIndex];
      if (!targetEntry) return;

      isUndoRedoRef.current = true;
      historyIndexRef.current = targetIndex;
      setCanUndo(targetIndex > 0);
      setCanRedo(true);

      onChange(targetEntry.text);

      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          const pos = Math.min(targetEntry.cursor, targetEntry.text.length);
          textarea.setSelectionRange(pos, pos);
          autoResize();
        }
      });
    },
    [autoResize]
  );

  // Perform Redo
  const handleRedo = useCallback(
    (onChange: (val: string) => void) => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return;

      const targetIndex = historyIndexRef.current + 1;
      const targetEntry = historyRef.current[targetIndex];
      if (!targetEntry) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      isUndoRedoRef.current = true;
      historyIndexRef.current = targetIndex;
      setCanUndo(true);
      setCanRedo(targetIndex < historyRef.current.length - 1);

      onChange(targetEntry.text);

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          const pos = Math.min(targetEntry.cursor, targetEntry.text.length);
          textarea.setSelectionRange(pos, pos);
          autoResize();
        }
      });
    },
    [autoResize]
  );

  // Apply Markdown formatting
  const applyFormatting = useCallback(
    (
      type: FormattingActionType,
      currentValue: string,
      onChange: (val: string) => void
    ) => {
      const textarea = textareaRef.current;
      const text = currentValue || "";

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      const currentCursor = textarea?.selectionStart ?? text.length;
      pushSnapshot(text, currentCursor);

      if (!textarea) {
        let appended = text;
        if (type === "bullet") appended = text ? `${text}\n• ` : "• ";
        else if (type === "number") appended = text ? `${text}\n1. ` : "1. ";
        else if (type === "checklist") appended = text ? `${text}\n- [ ] ` : "- [ ] ";
        else if (type === "bold") appended = text ? `${text} **bold**` : "**bold**";
        else if (type === "italic") appended = text ? `${text} *italic*` : "*italic*";
        else if (type === "code") appended = text ? `${text} \`code\`` : "`code`";
        pushSnapshot(appended, appended.length);
        onChange(appended);
        return;
      }

      const start = textarea.selectionStart ?? text.length;
      const end = textarea.selectionEnd ?? text.length;
      const selected = text.slice(start, end);

      let prefix = "";
      let suffix = "";
      let defaultText = "";

      switch (type) {
        case "bold":
          prefix = "**";
          suffix = "**";
          defaultText = "bold text";
          break;
        case "italic":
          prefix = "*";
          suffix = "*";
          defaultText = "italic text";
          break;
        case "code":
          prefix = "`";
          suffix = "`";
          defaultText = "code";
          break;
        case "bullet": {
          if (selected) {
            const lines = selected.split("\n");
            const formatted = lines
              .map((l) => (l.startsWith("• ") ? l : `• ${l}`))
              .join("\n");
            const nextVal = text.slice(0, start) + formatted + text.slice(end);
            pushSnapshot(nextVal, start + formatted.length);
            onChange(nextVal);
            requestAnimationFrame(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start + formatted.length);
              autoResize();
            });
            return;
          }
          const needsNewline = start > 0 && text[start - 1] !== "\n";
          prefix = needsNewline ? "\n• " : "• ";
          break;
        }
        case "number": {
          if (selected) {
            const lines = selected.split("\n");
            const formatted = lines
              .map((l, idx) => (/^\d+\.\s/.test(l) ? l : `${idx + 1}. ${l}`))
              .join("\n");
            const nextVal = text.slice(0, start) + formatted + text.slice(end);
            pushSnapshot(nextVal, start + formatted.length);
            onChange(nextVal);
            requestAnimationFrame(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start + formatted.length);
              autoResize();
            });
            return;
          }
          const needsNewline = start > 0 && text[start - 1] !== "\n";
          prefix = needsNewline ? "\n1. " : "1. ";
          break;
        }
        case "checklist": {
          if (selected) {
            const lines = selected.split("\n");
            const formatted = lines
              .map((l) => (l.startsWith("- [ ] ") ? l : `- [ ] ${l}`))
              .join("\n");
            const nextVal = text.slice(0, start) + formatted + text.slice(end);
            pushSnapshot(nextVal, start + formatted.length);
            onChange(nextVal);
            requestAnimationFrame(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start + formatted.length);
              autoResize();
            });
            return;
          }
          const needsNewline = start > 0 && text[start - 1] !== "\n";
          prefix = needsNewline ? "\n- [ ] " : "- [ ] ";
          break;
        }
        default:
          break;
      }

      const inserted = selected ? selected : defaultText;
      const nextVal =
        text.slice(0, start) + prefix + inserted + suffix + text.slice(end);
      const nextCursor =
        !selected && defaultText
          ? start + prefix.length + defaultText.length
          : start + prefix.length + inserted.length + suffix.length;

      pushSnapshot(nextVal, nextCursor);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        if (!selected && defaultText) {
          textarea.setSelectionRange(
            start + prefix.length,
            start + prefix.length + defaultText.length
          );
        } else {
          textarea.setSelectionRange(nextCursor, nextCursor);
        }
        autoResize();
      });
    },
    [autoResize, pushSnapshot]
  );

  // Handle typing input and manage history snapshots
  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    onChange: (val: string) => void
  ) => {
    const newText = e.target.value;
    const cursor = e.target.selectionStart;

    onChange(newText);
    autoResize();

    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const lastChar = newText[cursor - 1];
    const isBoundary =
      lastChar === " " ||
      lastChar === "\n" ||
      lastChar === "." ||
      lastChar === "," ||
      lastChar === ";" ||
      lastChar === ":";

    if (isBoundary) {
      pushSnapshot(newText, cursor);
    } else {
      typingTimeoutRef.current = setTimeout(() => {
        pushSnapshot(newText, cursor);
      }, TASK_EDITOR_DEFAULTS.TYPING_DEBOUNCE_MS);
    }
  };

  // Keyboard shortcut listener for Undo, Redo, Formatting, Smart Enter, and Tab
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    currentValue: string,
    onChange: (val: string) => void
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = currentValue || "";
    const pos = textarea.selectionStart;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // Undo / Redo / Format Shortcut Handling
    if (isCtrlOrMeta) {
      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (or Cmd+Z)
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo(text, onChange);
        return;
      }

      // Redo: Ctrl+Y OR Ctrl+Shift+Z (or Cmd+Shift+Z)
      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo(onChange);
        return;
      }

      // Bold: Ctrl+B
      if (key === "b" && !e.shiftKey) {
        e.preventDefault();
        applyFormatting("bold", text, onChange);
        return;
      }

      // Italic: Ctrl+I
      if (key === "i" && !e.shiftKey) {
        e.preventDefault();
        applyFormatting("italic", text, onChange);
        return;
      }
    }

    // Handle Smart Enter: bullet / numbered list continuation
    if (e.key === "Enter" && !e.shiftKey) {
      const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
      const currentLine = text.slice(lineStart, pos);

      // Bullet continuation
      const bulletMatch = currentLine.match(/^(\s*)(•|-|\*)\s(.*)$/);
      if (bulletMatch) {
        const [, indent, marker, content] = bulletMatch;
        e.preventDefault();
        pushSnapshot(text, pos);

        if (!content.trim()) {
          const nextVal = text.slice(0, lineStart) + text.slice(pos);
          pushSnapshot(nextVal, lineStart);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart, lineStart);
            autoResize();
          });
        } else {
          const insertion = `\n${indent}${marker} `;
          const nextVal = text.slice(0, pos) + insertion + text.slice(pos);
          const nextCursor = pos + insertion.length;
          pushSnapshot(nextVal, nextCursor);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(nextCursor, nextCursor);
            autoResize();
          });
        }
        return;
      }

      // Numbered list continuation
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (numberMatch) {
        const [, indent, numStr, content] = numberMatch;
        e.preventDefault();
        pushSnapshot(text, pos);

        if (!content.trim()) {
          const nextVal = text.slice(0, lineStart) + text.slice(pos);
          pushSnapshot(nextVal, lineStart);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart, lineStart);
            autoResize();
          });
        } else {
          const nextNum = parseInt(numStr, 10) + 1;
          const insertion = `\n${indent}${nextNum}. `;
          const nextVal = text.slice(0, pos) + insertion + text.slice(pos);
          const nextCursor = pos + insertion.length;
          pushSnapshot(nextVal, nextCursor);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(nextCursor, nextCursor);
            autoResize();
          });
        }
        return;
      }
    }

    // Handle Tab key: insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      pushSnapshot(text, pos);
      const nextVal = text.slice(0, pos) + "  " + text.slice(pos);
      const nextCursor = pos + 2;
      pushSnapshot(nextVal, nextCursor);
      onChange(nextVal);
      requestAnimationFrame(() => {
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
    }
  };

  return (
    <Controller
      name={name as any}
      control={control as any}
      rules={
        required
          ? { required: TASK_EDITOR_DEFAULTS.REQUIRED_ERROR }
          : undefined
      }
      render={({ field, fieldState: { error } }) => {
        const value = field.value || "";
        const charCount = value.length;
        const lineCount = value ? value.split("\n").length : 0;
        const errorMessage = manualError || error?.message;

        // Initialize history stack on first value assignment
        if (historyRef.current.length === 0) {
          historyRef.current = [{ text: value, cursor: value.length }];
          historyIndexRef.current = 0;
        }

        return (
          <div className={`${styles.editorContainer} ${className}`}>
            <div className={styles.toolbarHeader}>
              <div className={styles.headerTitle}>
                <CustomIcon
                  name="FileText"
                  size={14}
                  className={styles.titleIcon}
                />
                <span>{TASK_EDITOR_DEFAULTS.SECTION_TITLE}</span>
              </div>

              {!disabled && (
                <div className={styles.toolbarActions}>
                  {/* Undo & Redo History Actions */}
                  <div className={styles.historyActions}>
                    <CustomButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || !canUndo}
                      onClick={() => handleUndo(value, field.onChange)}
                      title={TASK_EDITOR_HISTORY_ACTIONS.UNDO.tooltip}
                      className={styles.toolButton}
                      icon={
                        <CustomIcon
                          name={TASK_EDITOR_HISTORY_ACTIONS.UNDO.iconName}
                          size={12}
                        />
                      }
                    >
                      {TASK_EDITOR_HISTORY_ACTIONS.UNDO.label}
                    </CustomButton>

                    <CustomButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || !canRedo}
                      onClick={() => handleRedo(field.onChange)}
                      title={TASK_EDITOR_HISTORY_ACTIONS.REDO.tooltip}
                      className={styles.toolButton}
                      icon={
                        <CustomIcon
                          name={TASK_EDITOR_HISTORY_ACTIONS.REDO.iconName}
                          size={12}
                        />
                      }
                    >
                      {TASK_EDITOR_HISTORY_ACTIONS.REDO.label}
                    </CustomButton>
                  </div>

                  <div className={styles.toolbarDivider} />

                  {/* Formatting Actions */}
                  <div className={styles.formattingActions}>
                    {TASK_EDITOR_TOOLBAR.map((tool) => (
                      <CustomButton
                        key={tool.type}
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          applyFormatting(tool.type, value, field.onChange)
                        }
                        title={tool.tooltip}
                        className={styles.toolButton}
                        icon={<CustomIcon name={tool.iconName} size={12} />}
                      >
                        {tool.label}
                      </CustomButton>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`glass-card ${styles.textareaCard} ${
                errorMessage ? styles.textareaCardError : ""
              }`}
            >
              <textarea
                ref={(el) => {
                  textareaRef.current = el;
                  field.ref(el);
                }}
                name={field.name}
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                className={styles.textareaInput}
                onChange={(e) => handleInputChange(e, field.onChange)}
                onKeyDown={(e) =>
                  handleKeyDown(e, value, field.onChange)
                }
              />

              <div className={styles.editorFooter}>
                <span className={styles.shortcutHint}>
                  {TASK_EDITOR_DEFAULTS.FOOTER_HINT}
                </span>
                <span className={styles.charCount}>
                  {lineCount > 1 ? `${lineCount} lines • ` : ""}
                  {charCount} chars
                </span>
              </div>
            </div>

            {errorMessage && (
              <span className={styles.errorText}>{errorMessage}</span>
            )}
          </div>
        );
      }}
    />
  );
};

export default TaskDescriptionEditor;
