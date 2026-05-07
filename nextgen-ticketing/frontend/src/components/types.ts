import type { Control, RegisterOptions, FieldValues, Path } from 'react-hook-form';

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  image?: string;
  disabled?: boolean;
}

export type MultiSelectOption = Option;

export interface CustomSelectProps<T extends FieldValues = any> {
  options: Option[];
  value?: string | string[];
  onChange?: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  error?: string;
  isMulti?: boolean;
  icon?: React.ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  serverSideSearch?: boolean;
}

export interface CustomInputProps<T extends FieldValues = any> extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
}

export interface CustomTextAreaProps<T extends FieldValues = any> extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  containerStyle?: React.CSSProperties;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
}

export interface TableColumn<T> {
  header: string;
  key: keyof T | string;
  render?: (item: T, index: number) => React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  width?: string;
}

export interface CustomTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface CustomFilterBarProps {
  options: FilterOption[];
  activeOption: string;
  onChange: (value: string) => void;
  containerStyle?: React.CSSProperties;
}

export interface CustomBadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'neutral';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  containerStyle?: React.CSSProperties;
}

export interface CustomDatePickerProps<T extends FieldValues = any> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: React.ReactNode;
  error?: string;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}

export interface CustomDateTimePickerProps<T extends FieldValues = any> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: React.ReactNode;
  error?: string;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}

export interface CustomColorPickerProps<T extends FieldValues = any> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: React.ReactNode;
  error?: string;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}
export interface CustomChipInputProps<T extends FieldValues = any> {
  label?: React.ReactNode;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  value?: string; // Comma separated
  onChange?: (value: string) => void;
}
