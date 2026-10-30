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
import { toEditorHtml, getTaskDescriptionPlainText } from "./richTextUtils";
import styles from "./TaskDescriptionEditor.module.css";

function getClosestElement(
  node: Node | null,
  selector: string,
  root: HTMLElement | null,
): HTMLElement | null {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      if (el.matches(selector)) return el;
    }
    curr = curr.parentNode;
  }
  return null;
}

export interface FormattedTaskDescriptionProps {
  content?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders formatted rich text / legacy Markdown task descriptions anywhere in the UI.
 */
export const FormattedTaskDescription: React.FC<
  FormattedTaskDescriptionProps
> = ({ content, className = "", style }) => {
  const html = toEditorHtml(content);
  if (!html) return null;

  return (
    <div
      className={`${styles.richContent} ${styles.formattedDisplay} ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface RichEditorInternalProps {
  value: string;
  onChange: (val: string) => void;
  label?: React.ReactNode;
  required?: boolean;
  maxLength?: number;
  minHeight?: number | string;
  containerStyle?: React.CSSProperties;
  disabled: boolean;
  placeholder: string;
  errorMessage?: string;
  className?: string;
}

const RichEditorInternal: React.FC<RichEditorInternalProps> = ({
  value,
  onChange,
  label = TASK_EDITOR_DEFAULTS.SECTION_TITLE,
  required = false,
  maxLength,
  minHeight,
  containerStyle,
  disabled,
  placeholder,
  errorMessage,
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedValueRef = useRef<string | null>(null);
  const isUndoRedoRef = useRef(false);
  const historyRef = useRef<EditorHistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeFormats, setActiveFormats] = useState<
    Record<FormattingActionType, boolean>
  >({
    bold: false,
    italic: false,
    bullet: false,
    number: false,
    checklist: false,
    code: false,
  });

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Sync external value changes (initial load, date switch, form reset) into DOM
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const incoming = value || "";
    if (lastEmittedValueRef.current === incoming) {
      return;
    }

    const richHtml = toEditorHtml(incoming);
    el.innerHTML = richHtml;
    lastEmittedValueRef.current = incoming;

    historyRef.current = [{ text: richHtml, cursor: 0 }];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [value]);

  const pushSnapshot = useCallback((htmlText: string) => {
    const currentHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    const lastEntry = currentHistory[currentHistory.length - 1];

    if (lastEntry && lastEntry.text === htmlText) {
      return;
    }

    currentHistory.push({ text: htmlText, cursor: 0 });
    if (currentHistory.length > TASK_EDITOR_DEFAULTS.MAX_HISTORY_STACK) {
      currentHistory.shift();
    }

    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const normalizeDomLists = useCallback((el: HTMLElement) => {
    // Ensure task list items carry task attributes
    el.querySelectorAll('ul[data-task-list="true"] > li').forEach((li) => {
      li.setAttribute("data-task-item", "true");
      if (!li.hasAttribute("data-checked")) {
        li.setAttribute("data-checked", "false");
      }
    });

    // Ensure regular ul/ol items do NOT carry leftover task attributes
    el.querySelectorAll(
      'ul:not([data-task-list="true"]) > li, ol > li',
    ).forEach((li) => {
      li.removeAttribute("data-task-item");
      li.removeAttribute("data-checked");
    });
  }, []);

  const readCurrentHtml = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return "";

    normalizeDomLists(el);

    const plainText = (el.innerText || "").replace(/\u200B/g, "").trim();
    const hasList = !!el.querySelector("ul, ol");

    if (!plainText && !hasList) {
      if (el.innerHTML !== "") {
        el.innerHTML = "";
      }
      return "";
    }

    return el.innerHTML;
  }, [normalizeDomLists]);

  const updateActiveFormats = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      setActiveFormats({
        bold: false,
        italic: false,
        bullet: false,
        number: false,
        checklist: false,
        code: false,
      });
      return;
    }

    let isBold = false;
    let isItalic = false;
    try {
      isBold = document.queryCommandState("bold");
      isItalic = document.queryCommandState("italic");
    } catch {
      // ignore queryCommandState errors
    }

    const closestList = getClosestElement(sel.anchorNode, "ul, ol", el);
    const isTaskList =
      closestList?.tagName.toLowerCase() === "ul" &&
      closestList.getAttribute("data-task-list") === "true";
    const isBulletList =
      closestList?.tagName.toLowerCase() === "ul" && !isTaskList;
    const isNumberList = closestList?.tagName.toLowerCase() === "ol";
    const isCode = !!getClosestElement(sel.anchorNode, "code", el);

    setActiveFormats({
      bold: isBold,
      italic: isItalic,
      bullet: isBulletList,
      number: isNumberList,
      checklist: isTaskList,
      code: isCode,
    });
  }, []);

  const focusEditorAtEndIfNeeded = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    const isInside = sel && sel.anchorNode && el.contains(sel.anchorNode);

    if (!isInside) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const placeCaretAtEnd = useCallback((node: Node) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const handleUndo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const currentHtml = readCurrentHtml();
    const currentEntry = historyRef.current[historyIndexRef.current];
    if (!currentEntry || currentEntry.text !== currentHtml) {
      pushSnapshot(currentHtml);
    }

    if (historyIndexRef.current <= 0) return;

    const targetIndex = historyIndexRef.current - 1;
    const targetEntry = historyRef.current[targetIndex];
    if (!targetEntry) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current = targetIndex;
    setCanUndo(targetIndex > 0);
    setCanRedo(true);

    el.innerHTML = targetEntry.text;
    lastEmittedValueRef.current = targetEntry.text;
    onChange(targetEntry.text);

    requestAnimationFrame(() => {
      el.focus();
      placeCaretAtEnd(el);
      updateActiveFormats();
    });
  }, [
    onChange,
    placeCaretAtEnd,
    pushSnapshot,
    readCurrentHtml,
    updateActiveFormats,
  ]);

  const handleRedo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
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

    el.innerHTML = targetEntry.text;
    lastEmittedValueRef.current = targetEntry.text;
    onChange(targetEntry.text);

    requestAnimationFrame(() => {
      el.focus();
      placeCaretAtEnd(el);
      updateActiveFormats();
    });
  }, [onChange, placeCaretAtEnd, updateActiveFormats]);

  const stripLeadingTextMarkersInSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;

    const cleanBlock = (block: Node) => {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode() as Text | null;
      if (firstText && firstText.textContent) {
        const cleaned = firstText.textContent.replace(
          /^\s*(?:\d+\.\s*)?(?:[•\-*]\s+)?(?:-?\s*\[[ xX]\]\s*)?/,
          "",
        );
        if (cleaned !== firstText.textContent) {
          firstText.textContent = cleaned;
        }
      }
    };

    const blocks = el.querySelectorAll("li, div, p");
    let matchedAny = false;
    blocks.forEach((b) => {
      if (sel.containsNode(b, true)) {
        matchedAny = true;
        cleanBlock(b);
      }
    });

    if (!matchedAny) {
      const fallback =
        getClosestElement(sel.anchorNode, "li, div, p", el) || el;
      cleanBlock(fallback);
    }
  }, []);

  const applyFormatting = useCallback(
    (type: FormattingActionType) => {
      const el = editorRef.current;
      if (!el || disabled) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      pushSnapshot(readCurrentHtml());
      focusEditorAtEndIfNeeded();

      const sel = window.getSelection();
      if (!sel) return;

      if (
        (type === "bullet" || type === "number" || type === "checklist") &&
        !el.innerHTML.trim()
      ) {
        el.innerHTML = "<div><br></div>";
        if (el.firstChild) {
          placeCaretAtEnd(el.firstChild);
        }
      }

      if (type === "bold") {
        document.execCommand("bold", false);
      } else if (type === "italic") {
        document.execCommand("italic", false);
      } else if (type === "bullet") {
        const closestList = getClosestElement(sel.anchorNode, "ul, ol", el);
        const isTaskList =
          closestList?.tagName.toLowerCase() === "ul" &&
          closestList.getAttribute("data-task-list") === "true";

        if (isTaskList && closestList) {
          // Convert Task list directly into Bullet list
          closestList.removeAttribute("data-task-list");
          closestList.querySelectorAll("li").forEach((li) => {
            li.removeAttribute("data-task-item");
            li.removeAttribute("data-checked");
          });
        } else {
          stripLeadingTextMarkersInSelection();
          document.execCommand("insertUnorderedList", false);
        }
      } else if (type === "number") {
        const closestList = getClosestElement(sel.anchorNode, "ul, ol", el);
        const isTaskList =
          closestList?.tagName.toLowerCase() === "ul" &&
          closestList.getAttribute("data-task-list") === "true";

        if (isTaskList && closestList) {
          closestList.removeAttribute("data-task-list");
          closestList.querySelectorAll("li").forEach((li) => {
            li.removeAttribute("data-task-item");
            li.removeAttribute("data-checked");
          });
        }
        stripLeadingTextMarkersInSelection();
        document.execCommand("insertOrderedList", false);
      } else if (type === "checklist") {
        const closestList = getClosestElement(sel.anchorNode, "ul, ol", el);
        const isTaskList =
          closestList?.tagName.toLowerCase() === "ul" &&
          closestList.getAttribute("data-task-list") === "true";

        if (isTaskList && closestList) {
          // Toggle off Task list back to normal lines
          closestList.removeAttribute("data-task-list");
          closestList.querySelectorAll("li").forEach((li) => {
            li.removeAttribute("data-task-item");
            li.removeAttribute("data-checked");
          });
          document.execCommand("insertUnorderedList", false);
        } else if (closestList?.tagName.toLowerCase() === "ul") {
          // Convert existing Bullet list into Task list
          closestList.setAttribute("data-task-list", "true");
          closestList.querySelectorAll("li").forEach((li) => {
            li.setAttribute("data-task-item", "true");
            if (!li.hasAttribute("data-checked")) {
              li.setAttribute("data-checked", "false");
            }
          });
        } else {
          // Either inside <ol> or normal text: convert to <ul> then mark as Task list
          stripLeadingTextMarkersInSelection();
          document.execCommand("insertUnorderedList", false);
          const newList =
            getClosestElement(
              window.getSelection()?.anchorNode || null,
              "ul",
              el,
            ) ||
            (el.querySelector(
              'ul:not([data-task-list="true"])',
            ) as HTMLElement | null);
          if (newList) {
            newList.setAttribute("data-task-list", "true");
            newList.querySelectorAll("li").forEach((li) => {
              li.setAttribute("data-task-item", "true");
              if (!li.hasAttribute("data-checked")) {
                li.setAttribute("data-checked", "false");
              }
            });
          }
        }
      } else if (type === "code") {
        const closestCode = getClosestElement(sel.anchorNode, "code", el);
        if (closestCode) {
          const codeText = (closestCode.textContent || "").replace(
            /\u200B/g,
            "",
          );
          if (!sel.isCollapsed || !codeText) {
            // Unwrap the <code> element
            const parent = closestCode.parentNode;
            if (parent) {
              while (closestCode.firstChild) {
                parent.insertBefore(closestCode.firstChild, closestCode);
              }
              parent.removeChild(closestCode);
            }
          } else {
            // Move caret outside after <code> so user can type normal text
            const spaceNode = document.createTextNode("\u200B");
            closestCode.after(spaceNode);
            const range = document.createRange();
            range.setStart(spaceNode, 1);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const selectedText = range.toString();
          const codeEl = document.createElement("code");

          if (selectedText) {
            codeEl.textContent = selectedText;
            range.deleteContents();
            range.insertNode(codeEl);
            const nextRange = document.createRange();
            nextRange.selectNodeContents(codeEl);
            sel.removeAllRanges();
            sel.addRange(nextRange);
          } else {
            codeEl.textContent = "\u200B";
            range.insertNode(codeEl);
            const nextRange = document.createRange();
            nextRange.setStart(codeEl.firstChild!, 1);
            nextRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(nextRange);
          }
        }
      }

      const nextHtml = readCurrentHtml();
      pushSnapshot(nextHtml);
      lastEmittedValueRef.current = nextHtml;
      onChange(nextHtml);
      updateActiveFormats();
    },
    [
      disabled,
      focusEditorAtEndIfNeeded,
      onChange,
      pushSnapshot,
      readCurrentHtml,
      stripLeadingTextMarkersInSelection,
      updateActiveFormats,
    ],
  );

  const handleInput = useCallback(() => {
    const nextHtml = readCurrentHtml();
    lastEmittedValueRef.current = nextHtml;
    onChange(nextHtml);
    updateActiveFormats();

    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      pushSnapshot(nextHtml);
    }, TASK_EDITOR_DEFAULTS.TYPING_DEBOUNCE_MS);
  }, [onChange, pushSnapshot, readCurrentHtml, updateActiveFormats]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const el = editorRef.current;
    if (!el) return;

    const target = e.target as HTMLElement;
    const taskLi = target.closest(
      'li[data-task-item="true"]',
    ) as HTMLElement | null;

    if (taskLi && el.contains(taskLi)) {
      const rect = taskLi.getBoundingClientRect();
      // Clicked on the checkbox indicator area on the left of the task item
      if (e.clientX - rect.left <= 24) {
        e.preventDefault();
        pushSnapshot(readCurrentHtml());
        const isChecked = taskLi.getAttribute("data-checked") === "true";
        taskLi.setAttribute("data-checked", isChecked ? "false" : "true");
        const nextHtml = readCurrentHtml();
        pushSnapshot(nextHtml);
        lastEmittedValueRef.current = nextHtml;
        onChange(nextHtml);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    if (!el || disabled) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    if (isCtrlOrMeta) {
      const key = e.key.toLowerCase();

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (key === "b" && !e.shiftKey) {
        e.preventDefault();
        applyFormatting("bold");
        return;
      }

      if (key === "i" && !e.shiftKey) {
        e.preventDefault();
        applyFormatting("italic");
        return;
      }
    }

    const sel = window.getSelection();

    // Handle Enter inside inline <code> or Task list
    if (e.key === "Enter" && !e.shiftKey && sel && sel.anchorNode) {
      const closestCode = getClosestElement(sel.anchorNode, "code", el);
      if (closestCode) {
        e.preventDefault();
        const br = document.createElement("br");
        const zwsp = document.createTextNode("\u200B");
        closestCode.after(br);
        br.after(zwsp);
        const range = document.createRange();
        range.setStart(zwsp, 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
        return;
      }

      const taskLi = getClosestElement(
        sel.anchorNode,
        'li[data-task-item="true"]',
        el,
      );
      if (taskLi) {
        const liText = (taskLi.textContent || "").replace(/\u200B/g, "").trim();
        if (!liText) {
          // Empty task item -> exit task list cleanly
          e.preventDefault();
          const parentUl = taskLi.parentElement;
          document.execCommand("insertUnorderedList", false);
          if (parentUl && parentUl.children.length === 0) {
            parentUl.remove();
          }
          handleInput();
          return;
        }

        // When splitting/continuing a task item, ensure the new <li> starts unchecked
        requestAnimationFrame(() => {
          const currentSel = window.getSelection();
          const newLi = getClosestElement(
            currentSel?.anchorNode || null,
            'ul[data-task-list="true"] > li',
            el,
          );
          if (newLi && newLi !== taskLi) {
            newLi.setAttribute("data-task-item", "true");
            newLi.setAttribute("data-checked", "false");
            handleInput();
          }
        });
      }
    }

    // Handle Tab for list indentation or spacing
    if (e.key === "Tab") {
      e.preventDefault();
      pushSnapshot(readCurrentHtml());
      const inList =
        sel && sel.anchorNode && getClosestElement(sel.anchorNode, "li", el);
      if (inList) {
        document.execCommand(e.shiftKey ? "outdent" : "indent", false);
      } else if (!e.shiftKey) {
        document.execCommand("insertText", false, "  ");
      }
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const plain = e.clipboardData.getData("text/plain");
    if (!plain) return;

    pushSnapshot(readCurrentHtml());
    document.execCommand("insertText", false, plain);
    handleInput();
  };

  const plainText = getTaskDescriptionPlainText(value);
  const charCount = plainText.length;
  const lineCount = plainText ? plainText.split("\n").length : 0;
  const isOverLimit = typeof maxLength === "number" && charCount > maxLength;

  return (
    <div
      className={`${styles.editorContainer} ${className}`}
      style={containerStyle}
    >
      <div className={styles.toolbarHeader}>
        <div className={styles.headerTitle}>
          {typeof label === "string" ? (
            <>
              <CustomIcon
                name="FileText"
                size={14}
                className={styles.titleIcon}
              />
              <span>
                {label}
                {required && (
                  <span
                    style={{
                      color: "var(--accent-danger)",
                      marginLeft: "0.2rem",
                    }}
                  >
                    *
                  </span>
                )}
              </span>
            </>
          ) : (
            label
          )}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleUndo}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleRedo}
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
              {TASK_EDITOR_TOOLBAR.map((tool) => {
                const isActive = activeFormats[tool.type];
                return (
                  <CustomButton
                    key={tool.type}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting(tool.type)}
                    title={tool.tooltip}
                    className={`${styles.toolButton} ${
                      isActive ? styles.activeToolButton : ""
                    }`}
                    icon={<CustomIcon name={tool.iconName} size={12} />}
                  >
                    {tool.label}
                  </CustomButton>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        className={`glass-card ${styles.textareaCard} ${
          errorMessage || isOverLimit ? styles.textareaCardError : ""
        }`}
        onClick={() => {
          if (
            !disabled &&
            editorRef.current &&
            document.activeElement !== editorRef.current
          ) {
            editorRef.current.focus();
          }
        }}
      >
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable={!disabled}
          suppressContentEditableWarning
          data-placeholder={placeholder}
          style={minHeight ? { minHeight } : undefined}
          className={`${styles.richEditorInput} ${styles.richContent} ${
            disabled ? styles.richEditorDisabled : ""
          }`}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={updateActiveFormats}
          onMouseDown={handleMouseDown}
          onPaste={handlePaste}
        />

        <div className={styles.editorFooter}>
          <span className={styles.shortcutHint}>
            {TASK_EDITOR_DEFAULTS.FOOTER_HINT}
          </span>
          <span
            className={styles.charCount}
            style={
              isOverLimit
                ? { color: "var(--accent-danger)", fontWeight: 600 }
                : undefined
            }
          >
            {lineCount > 1 ? `${lineCount} lines • ` : ""}
            {typeof maxLength === "number"
              ? `${charCount} / ${maxLength} chars`
              : `${charCount} chars`}
          </span>
        </div>
      </div>

      {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}
    </div>
  );
};

export function TaskDescriptionEditor<TFieldValues extends FieldValues = any>({
  name,
  control,
  value,
  onChange,
  label = TASK_EDITOR_DEFAULTS.SECTION_TITLE,
  disabled = false,
  placeholder = TASK_EDITOR_DEFAULTS.DEFAULT_PLACEHOLDER,
  required = false,
  maxLength,
  rules,
  minHeight,
  containerStyle,
  error: manualError,
  className = "",
}: TaskDescriptionEditorProps<TFieldValues>) {
  if (control && name) {
    const requiredMessage =
      typeof rules?.required === "string"
        ? rules.required
        : typeof label === "string" &&
            label !== TASK_EDITOR_DEFAULTS.SECTION_TITLE
          ? `${label} is required`
          : TASK_EDITOR_DEFAULTS.REQUIRED_ERROR;

    const isRequired = required || Boolean(rules?.required);

    return (
      <Controller
        name={name as any}
        control={control as any}
        rules={{
          ...rules,
          required: false,
          validate: (val: string) => {
            const plain = getTaskDescriptionPlainText(val);
            if (isRequired && plain.length === 0) {
              return requiredMessage;
            }
            if (typeof maxLength === "number" && plain.length > maxLength) {
              return `Maximum ${maxLength} characters allowed`;
            }
            if (typeof rules?.validate === "function") {
              return rules.validate(val);
            }
            return true;
          },
        }}
        render={({ field, fieldState: { error } }) => {
          const errorMessage = manualError || error?.message;
          return (
            <RichEditorInternal
              value={field.value || ""}
              onChange={field.onChange}
              label={label}
              required={isRequired}
              maxLength={maxLength}
              minHeight={minHeight}
              containerStyle={containerStyle}
              disabled={disabled}
              placeholder={placeholder}
              errorMessage={errorMessage}
              className={className}
            />
          );
        }}
      />
    );
  }

  return (
    <RichEditorInternal
      value={value || ""}
      onChange={onChange || (() => {})}
      label={label}
      required={required}
      maxLength={maxLength}
      minHeight={minHeight}
      containerStyle={containerStyle}
      disabled={disabled}
      placeholder={placeholder}
      errorMessage={manualError}
      className={className}
    />
  );
}

export default TaskDescriptionEditor;
