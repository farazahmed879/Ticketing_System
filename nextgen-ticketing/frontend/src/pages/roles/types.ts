import type { Role, RoleFormData } from "../../types";

export interface RoleFormProps {
  initialData?: Role | null;
  statuses: any[];
  onSubmit: (data: RoleFormData) => Promise<void>;
}

export interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  statuses: any[];
  onSubmit: (data: RoleFormData) => Promise<void>;
  isLoading?: boolean;
}
