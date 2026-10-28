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
  name: Path<TFieldValues> | string;
  control: Control<TFieldValues, any, any>;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
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
