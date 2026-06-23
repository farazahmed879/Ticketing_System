import type { Interview } from "../../../types";

export interface InterviewListHeaderProps {
  canCreateInterviews: boolean;
  onScheduleClick: () => void;
}

export interface InterviewListFilterProps {
  search: string;
  setSearch: (val: string) => void;
  showMoreFilters: boolean;
  activeMoreFilters: number;
  draftSelectedCount: number;
  toggleMoreFilters: () => void;
  filters: any[];
  draftActiveFilter: string;
  setDraftActiveFilter: (val: string) => void;
  draftStartDate: string;
  setDraftStartDate: (val: string) => void;
  draftEndDate: string;
  setDraftEndDate: (val: string) => void;
  clearMoreFilters: () => void;
  applyMoreFilters: () => void;
}

export interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  interview?: Interview | null;
}
