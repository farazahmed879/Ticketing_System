import type { Control, RegisterOptions } from 'react-hook-form';

export interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  image?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: Option[];
  value?: string | string[];
  onChange?: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
  name?: string;
  control?: Control<any>;
  rules?: RegisterOptions;
  error?: string;
  isMulti?: boolean;
  icon?: React.ReactNode;
}

export interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  name?: string;
  control?: Control<any>;
  rules?: RegisterOptions;
}

export interface CustomTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  containerStyle?: React.CSSProperties;
  name?: string;
  control?: Control<any>;
  rules?: RegisterOptions;
}

export interface TableColumn<T> {
  header: string;
  key: keyof T | string;
  render?: (item: T) => React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
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

export interface CustomDatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  name?: string;
  control?: Control<any>;
  rules?: RegisterOptions;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}

export interface CustomDateTimePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  name?: string;
  control?: Control<any>;
  rules?: RegisterOptions;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}
