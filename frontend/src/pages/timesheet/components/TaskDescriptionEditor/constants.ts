import type { ToolbarAction, HistoryActionConfig } from "./types";

export const TASK_EDITOR_HISTORY_ACTIONS = {
  UNDO: {
    type: "undo" as const,
    label: "Undo",
    iconName: "Undo2",
    tooltip: "Undo (Ctrl+Z)",
  },
  REDO: {
    type: "redo" as const,
    label: "Redo",
    iconName: "Redo2",
    tooltip: "Redo (Ctrl+Y / Ctrl+Shift+Z)",
  },
} as const satisfies Record<string, HistoryActionConfig>;

export const TASK_EDITOR_TOOLBAR: ToolbarAction[] = [
  {
    type: "bold",
    label: "Bold",
    iconName: "Bold",
    tooltip: "Bold (Ctrl+B)",
  },
  {
    type: "italic",
    label: "Italic",
    iconName: "Italic",
    tooltip: "Italic (Ctrl+I)",
  },
  {
    type: "bullet",
    label: "Bullet",
    iconName: "List",
    tooltip: "Bullet list",
  },
  {
    type: "number",
    label: "Numbered",
    iconName: "ListOrdered",
    tooltip: "Numbered list",
  },
  {
    type: "checklist",
    label: "Task",
    iconName: "CheckSquare",
    tooltip: "Task checklist",
  },
  {
    type: "code",
    label: "Code",
    iconName: "Code",
    tooltip: "Inline code",
  },
];

export const TASK_EDITOR_DEFAULTS = {
  MIN_HEIGHT: 96,
  MAX_HEIGHT: 320,
  DEFAULT_PLACEHOLDER:
    "What did you work on? Deliverables, bug fixes, tickets, or pull requests...",
  SECTION_TITLE: "Details & Progress",
  REQUIRED_ERROR: "Description is required",
  MAX_HISTORY_STACK: 50,
  TYPING_DEBOUNCE_MS: 300,
  FOOTER_HINT: "Enter for next item • Tab to indent • Ctrl+Z/Y for Undo/Redo",
} as const;
