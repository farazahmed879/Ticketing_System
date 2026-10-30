import type React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

export type FormattingActionType =
  | "bold"
  | "italic"
  | "bullet"
  | "number"
  | "code"
  | "checklist";

export interface TaskDescriptionEditorProps<
  TFieldValues extends FieldValues = any,
> {
  name?: Path<TFieldValues> | string;
  control?: Control<TFieldValues, any, any>;
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  rules?: Record<string, any>;
  minHeight?: number | string;
  containerStyle?: React.CSSProperties;
  error?: string;
  className?: string;
}

export interface ToolbarAction {
  type: FormattingActionType;
  label: string;
  iconName: string;
  tooltip: string;
}

export interface EditorHistoryEntry {
  text: string;
  cursor: number;
}

export interface HistoryActionConfig {
  type: "undo" | "redo";
  label: string;
  iconName: string;
  tooltip: string;
}
