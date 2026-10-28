export interface DeleteAllCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  totalCandidates?: number;
}
