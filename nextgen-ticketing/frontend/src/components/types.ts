import type {
  Control,
  RegisterOptions,
  FieldValues,
  Path,
} from "react-hook-form";
import * as Icons from "lucide-react";
import type { TicketDetail } from "../types";

export type IconName = keyof typeof Icons;

export interface CustomIconProps extends Omit<Icons.LucideProps, "ref"> {
  name: IconName | string;
}

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  image?: string;
  disabled?: boolean;
}

export interface AvatarItem {
  id: string;
  name: string;
  image?: string;
}

export interface CustomAvatarStackProps {
  items: AvatarItem[];
  limit?: number;
  size?: number;
  className?: string;
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

export interface CustomMultiSelectProps<T extends FieldValues = any> {
  options: MultiSelectOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
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
}

export interface CustomInputProps<
  T extends FieldValues = any,
> extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
}

export interface CustomTextAreaProps<
  T extends FieldValues = any,
> extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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
  style?: React.CSSProperties;
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
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "primary"
    | "secondary"
    | "neutral";
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "gradient";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  containerStyle?: React.CSSProperties;
}

export interface CustomDatePickerProps<
  T extends FieldValues = any,
> extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  label?: React.ReactNode;
  error?: string;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}

export interface CustomDateTimePickerProps<
  T extends FieldValues = any,
> extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  label?: React.ReactNode;
  error?: string;
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  containerStyle?: React.CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
}

export interface CustomColorPickerProps<
  T extends FieldValues = any,
> extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
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

export interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[] | readonly number[];
}

export interface PhoneInputProps<T extends FieldValues = any> {
  label?: string;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  name?: Path<T>;
  countryCodeName?: Path<T>;
  control?: Control<T>;
}

export interface CustomImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  containerStyle?: React.CSSProperties;
  borderRadius?: string | number;
  showSkeleton?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  minHeight?: string;
  headerAction?: React.ReactNode;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
}

export interface DropdownMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface CustomDropdownMenuProps {
  items: DropdownMenuItem[];
  triggerIcon?: string;
  triggerSize?: number;
  position?: "left" | "right";
  style?: React.CSSProperties;
}

export interface FullScreenLoaderProps {
  subMessage?: string;
}

export interface StandardListLayoutProps {
  header?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode; // Usually the scrollable table area
  pagination?: React.ReactNode;
  height?: string;
}

export interface TicketDetailCommentsProps {
  ticket: TicketDetail;
  user: any;
  newComment: string;
  setNewComment: (val: string) => void;
  isNote: boolean;
  setIsNote: (val: boolean) => void;
  commentAttachments: string[];
  commentAttachmentError: string | null;
  commentFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleCommentAttachmentSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  removeCommentAttachment: (idx: number) => void;
  handleAddComment: (e: React.FormEvent) => void;
  isSubmittingComment: boolean;
  commentSendDisabled: boolean;
  openLightbox: (images: string[], index: number) => void;
}

export interface TicketDetailAttachmentsProps {
  ticket: TicketDetail;
  canEditContent: boolean;
  isEditingAttachments: boolean;
  attachmentsDraft: string[];
  attachmentsDraftError: string | null;
  attachmentsEditFileInputRef: React.RefObject<HTMLInputElement | null>;
  startEditAttachments: () => void;
  cancelEditAttachments: () => void;
  handleAttachmentsDraftSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  removeAttachmentDraft: (idx: number) => void;
  openLightbox: (images: string[], index: number) => void;
}
