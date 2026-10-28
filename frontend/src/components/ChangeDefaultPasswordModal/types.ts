export interface ChangeDefaultPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type PasswordStrengthLevel = "too_short" | "weak" | "good" | "strong" | "";

export interface PasswordStrength {
  score: number;
  label: string;
  level: PasswordStrengthLevel;
}
