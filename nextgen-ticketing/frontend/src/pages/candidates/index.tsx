import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import {
  CandidateStatus,
  UIMessages,
  DEFAULT_PAGE_SIZE,
} from "../../utils/constants";
import { useNavigate } from "react-router-dom";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";

import CandidateModal from "./components/CandidateModal";
import BulkUploadModal from "./components/BulkUploadModal";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getCandidateColumns, statusBadgeVariant } from "./columns";
import { formatDate } from "../../utils/helpers";
import CustomBadge from "../../components/CustomBadge";
import CustomImage from "../../components/CustomImage";
import styles from "./CandidateList.module.css";

const CandidateList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();

  // Pagination & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("exclude_hired");
  const [positionFilter, setPositionFilter] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  // Applied (submitted) search values — the query reads THESE, not the live
  // input, so it only refetches on Search/Analyze/Enter, never on each keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedAiPrompt, setAppliedAiPrompt] = useState("");
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  // More Filters state
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [immediateJoinerFilter, setImmediateJoinerFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [candidateToConvert, setCandidateToConvert] = useState<string | null>(
    null,
  );

  // Tracks the filter values that were last submitted via Enter/Filter button.
  // Used to detect when an applied text filter is cleared so we can auto-refetch.
  const activeFiltersRef = useRef({
    search: "",
    position: "",
    skills: "",
    aiPrompt: "",
  });

  const { data: candidatesData, isLoading: loading } = useQuery({
    queryKey: [
      "candidates",
      statusFilter,
      !isAiMode ? appliedSearch : undefined,
      !isAiMode ? positionFilter : undefined,
      !isAiMode ? skillsFilter : undefined,
      isAiMode ? appliedAiPrompt : undefined,
      cityFilter,
      immediateJoinerFilter,
      dateFromFilter,
      dateToFilter,
      currentPage,
      itemsPerPage,
    ],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.CANDIDATES.BASE, {
        params: {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: !isAiMode && appliedSearch ? appliedSearch : undefined,
          position: !isAiMode && positionFilter ? positionFilter : undefined,
          skills: !isAiMode && skillsFilter ? skillsFilter : undefined,
          aiPrompt: isAiMode && appliedAiPrompt ? appliedAiPrompt : undefined,
          city: cityFilter || undefined,
          immediateJoiner: immediateJoinerFilter || undefined,
          dateFrom: dateFromFilter || undefined,
          dateTo: dateToFilter || undefined,
          limit: itemsPerPage,
          page: currentPage,
        },
      });
      return {
        candidates: res.data.candidates,
        total: res.data.total || 0,
        vague: res.data.vague || false,
        vagueMessage: res.data.message as string | undefined,
      };
    },
  });

  const candidates = candidatesData?.candidates || [];
  const totalItems = candidatesData?.total || 0;

  // When the AI query is too vague to search on, tell the user via a popup.
  useEffect(() => {
    if (candidatesData?.vague) {
      showNotification(
        "warning",
        candidatesData.vagueMessage ||
          "Your search is too vague. Try naming a skill, technology, or role.",
      );
    }
  }, [candidatesData?.vague, candidatesData?.vagueMessage, showNotification]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (currentEditingId) {
        return api.put(API_ROUTES.CANDIDATES.BY_ID(currentEditingId), payload);
      } else {
        return api.post(API_ROUTES.CANDIDATES.BASE, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      // Also refresh the single-candidate detail so a newly added note shows
      // up immediately instead of only after a manual page refresh.
      if (currentEditingId) {
        queryClient.invalidateQueries({
          queryKey: ["candidate", currentEditingId],
        });
      }
      showNotification(
        "success",
        `Candidate ${currentEditingId ? "updated" : "created"} successfully`,
      );
      setIsModalOpen(false);
      setCurrentEditingId(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to save candidate",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.CANDIDATES.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.DELETING),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      showNotification("success", "Candidate deleted successfully");
      setIsDeleteModalOpen(false);
      setCandidateToDelete(null);
    },
    onError: () => {
      showNotification("error", "Failed to delete candidate");
      setCandidateToDelete(null);
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(API_ROUTES.CANDIDATES.CONVERT(id));
    },
    onMutate: () => setIsLoading(true, "Converting candidate..."),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      showNotification("success", "Candidate converted to user successfully");
      setIsConvertModalOpen(false);
      setCandidateToConvert(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to convert candidate",
      );
      setCandidateToConvert(null);
    },
  });

  const handleSearch = () => {
    // Commit the live input so the query runs — this is the only place the
    // search/AI prompt actually triggers a fetch.
    setAppliedSearch(searchTerm);
    setAppliedAiPrompt(aiPrompt);
    setCurrentPage(0);
  };

  const handleFormSubmit = async (payload: any) => {
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // The error message (e.g. "A candidate with this email already exists")
      // is surfaced by the mutation's onError handler. Swallow the rejection
      // here so the finally block always clears the loading state.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setCandidateToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    deleteMutation.mutate(candidateToDelete);
  };

  const handleConvertClick = (id: string) => {
    setCandidateToConvert(id);
    setIsConvertModalOpen(true);
  };

  const confirmConvert = async () => {
    if (!candidateToConvert) return;
    convertMutation.mutate(candidateToConvert);
  };

  const columns = getCandidateColumns(
    handleConvertClick,
    setCurrentEditingId,
    setIsModalOpen,
    handleDelete,
    isAiMode,
  );

  return (
    <>
      <StandardListLayout
        header={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                Candidates
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage interview candidates and their profiles
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <CustomButton
                variant="outline"
                icon={<CustomIcon name="Copy" size={20} />}
                onClick={() => setIsBulkModalOpen(true)}
              >
                Bulk Upload
              </CustomButton>
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={() => {
                  setCurrentEditingId(null);
                  setIsModalOpen(true);
                }}
              >
                Add Candidate
              </CustomButton>
            </div>
          </div>
        }
        filters={
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* AI Mode Toggle */}
            <CustomButton
              variant={isAiMode ? "gradient" : "outline"}
              size="sm"
              icon={<CustomIcon name="Sparkles" size={16} />}
              onClick={() => {
                setIsAiMode(!isAiMode);
                setCurrentPage(0);
                activeFiltersRef.current = {
                  search: "",
                  position: "",
                  skills: "",
                  aiPrompt: "",
                };
                setAppliedSearch("");
                setAppliedAiPrompt("");
                if (!isAiMode) {
                  setSearchTerm("");
                  setPositionFilter("");
                  setSkillsFilter("");
                } else {
                  setAiPrompt("");
                }
              }}
            >
              {isAiMode ? "AI Mode" : "AI"}
            </CustomButton>

            {/* Search Bar */}
            <div style={{ flex: "none" }}>
              <CustomInput
                placeholder={
                  isAiMode
                    ? "Senior React developer with strong communication skills..."
                    : "Search by name, email, position..."
                }
                value={isAiMode ? aiPrompt : searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  isAiMode
                    ? setAiPrompt(e.target.value)
                    : setSearchTerm(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleSearch()
                }
                icon={<CustomIcon name="Search" size={18} />}
                containerStyle={{ width: "350px" }}
              />
            </div>

            <CustomButton variant="primary" onClick={handleSearch}>
              {isAiMode ? "Analyze" : "Search"}
            </CustomButton>

            {/* Filters Dropdown */}
            <div className={styles.filterAnchor}>
              <CustomButton
                variant={
                  showMoreFilters ||
                  positionFilter ||
                  skillsFilter ||
                  statusFilter !== "exclude_hired" ||
                  cityFilter ||
                  immediateJoinerFilter ||
                  dateFromFilter ||
                  dateToFilter
                    ? "primary"
                    : "secondary"
                }
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                icon={<CustomIcon name="SlidersHorizontal" size={18} />}
              >
                Filters
                {(() => {
                  const count = [
                    positionFilter,
                    skillsFilter,
                    statusFilter !== "exclude_hired" ? statusFilter : "",
                    cityFilter,
                    immediateJoinerFilter,
                    dateFromFilter,
                    dateToFilter,
                  ].filter(Boolean).length;
                  return count > 0 ? (
                    <span
                      style={{
                        marginLeft: 8,
                        background: "rgba(255,255,255,0.25)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        minWidth: 18,
                        textAlign: "center" as const,
                        padding: "1px 6px",
                      }}
                    >
                      {count}
                    </span>
                  ) : null;
                })()}
                <CustomIcon
                  name={showMoreFilters ? "ChevronUp" : "ChevronDown"}
                  size={16}
                  style={{ marginLeft: 6 }}
                />
              </CustomButton>

              {showMoreFilters && (
                <div className={styles.advancedPanel}>
                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="Briefcase" size={12} /> Position
                    </span>
                    <CustomInput
                      placeholder="e.g. Frontend Dev"
                      value={positionFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPositionFilter(e.target.value)
                      }
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                        e.key === "Enter" && handleSearch()
                      }
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="Cpu" size={12} /> Technical Skills
                    </span>
                    <CustomInput
                      placeholder="e.g. React, Node.js"
                      value={skillsFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSkillsFilter(e.target.value)
                      }
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                        e.key === "Enter" && handleSearch()
                      }
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="CircleDot" size={12} /> Status
                    </span>
                    <CustomSelect
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      placeholder="All Statuses"
                      options={[
                        { value: "exclude_hired", label: "Not Hired" },
                        { value: "all", label: "All Statuses" },
                        { value: CandidateStatus.ACTIVE, label: "Active" },
                        { value: CandidateStatus.HIRED, label: "Hired" },
                        { value: CandidateStatus.REJECTED, label: "Rejected" },
                        { value: CandidateStatus.ON_HOLD, label: "On Hold" },
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="MapPin" size={12} /> City
                    </span>
                    <CustomInput
                      placeholder="e.g. Islamabad"
                      value={cityFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCityFilter(e.target.value)
                      }
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                        e.key === "Enter" && handleSearch()
                      }
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="Zap" size={12} /> Immediate Joiner
                    </span>
                    <CustomSelect
                      value={immediateJoinerFilter}
                      onChange={(val) => setImmediateJoinerFilter(val)}
                      placeholder="All"
                      options={[
                        { value: "", label: "All" },
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" },
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="Calendar" size={12} /> Added From
                    </span>
                    <CustomInput
                      type="date"
                      value={dateFromFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDateFromFilter(e.target.value)
                      }
                    />
                  </div>

                  <div className={styles.filterField}>
                    <span className={styles.filterLabel}>
                      <CustomIcon name="Calendar" size={12} /> Added To
                    </span>
                    <CustomInput
                      type="date"
                      value={dateToFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDateToFilter(e.target.value)
                      }
                    />
                  </div>

                  <div className={styles.filterActions}>
                    {(positionFilter ||
                      skillsFilter ||
                      statusFilter !== "exclude_hired" ||
                      cityFilter ||
                      immediateJoinerFilter ||
                      dateFromFilter ||
                      dateToFilter) && (
                      <CustomButton
                        variant="ghost"
                        onClick={() => {
                          setPositionFilter("");
                          setSkillsFilter("");
                          setStatusFilter("exclude_hired");
                          setCityFilter("");
                          setImmediateJoinerFilter("");
                          setDateFromFilter("");
                          setDateToFilter("");
                          setCurrentPage(0);
                          setShowMoreFilters(false);
                        }}
                        icon={<CustomIcon name="X" size={16} />}
                      >
                        Clear all
                      </CustomButton>
                    )}
                    <CustomButton
                      variant="gradient"
                      onClick={() => {
                        handleSearch();
                        setShowMoreFilters(false);
                      }}
                      icon={<CustomIcon name="Check" size={16} />}
                    >
                      Apply Filters
                    </CustomButton>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--border-glass)",
                background: "rgba(255,255,255,0.03)",
                marginLeft: "auto",
              }}
            >
              <CustomButton
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                icon={<CustomIcon name="List" size={16} />}
                title="List view"
                style={{ padding: "6px 10px" }}
              />
              <CustomButton
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                icon={<CustomIcon name="LayoutGrid" size={16} />}
                title="Grid view"
                style={{ padding: "6px 10px" }}
              />
            </div>
          </div>
        }
        pagination={
          <CustomPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(0);
            }}
          />
        }
      >
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={candidates}
            loading={loading}
            loadingMessage="Loading candidates..."
            emptyMessage="No candidates found"
            onRowClick={(c) => navigate(`/candidates/${c.id}`)}
          />
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            Loading candidates...
          </div>
        ) : candidates.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            No candidates found
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              padding: "4px 0",
              alignContent: "start",
            }}
          >
            {candidates.map((c: any) => (
              <div
                key={c.id}
                onClick={() => navigate(`/candidates/${c.id}`)}
                className="glass-card"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                  transition: "var(--transition-normal)",
                  position: "relative",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "rgba(124, 58, 237, 0.1)",
                        color: "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
                        {c.name}
                      </h3>
                      <span className="text-xs-muted" style={{ display: "block", marginTop: 2 }}>
                        {c.position}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <CustomBadge variant={statusBadgeVariant(c.status)}>
                      {c.status}
                    </CustomBadge>
                    <div
                      style={{ display: "flex", gap: 2, marginLeft: 6 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!c.isConverted && (
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCandidateToConvert(c.id);
                            setIsConvertModalOpen(true);
                          }}
                          icon={<CustomIcon name="UserPlus" size={14} />}
                          style={{ padding: 6, minHeight: "auto", color: "var(--accent-success)" }}
                        />
                      )}
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentEditingId(c.id);
                          setIsModalOpen(true);
                        }}
                        icon={<CustomIcon name="Edit2" size={14} />}
                        style={{ padding: 6, minHeight: "auto" }}
                      />
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCandidateToDelete(c.id);
                          setIsDeleteModalOpen(true);
                        }}
                        icon={<CustomIcon name="Trash2" size={14} />}
                        style={{ padding: 6, minHeight: "auto", color: "var(--accent-danger)" }}
                      />
                    </div>
                  </div>
                </div>

                {isAiMode && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="text-xs-muted" style={{ fontWeight: 600 }}>AI Match Score</span>
                      <span className="text-xs" style={{ fontWeight: 700, color: "var(--accent-primary)" }}>{c.matchScore || 0}%</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${c.matchScore || 0}%`,
                          background: "var(--accent-primary)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CustomIcon name="Mail" size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {c.email}
                    </span>
                  </div>
                  {c.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CustomIcon name="Phone" size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {c.phone}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CustomIcon name="MapPin" size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {c.city
                        ? c.nationality
                          ? `${c.city}, ${c.nationality}`
                          : c.city
                        : c.nationality || c.address || "No location provided"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-glass)", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {c.createdBy?.image ? (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden" }}>
                        <CustomImage src={c.createdBy.image} alt={c.createdBy.fullname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : c.createdBy ? (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "var(--bg-glass)",
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {c.createdBy.fullname.charAt(0)}
                      </div>
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>—</div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.createdBy?.fullname || "System"}
                      </span>
                      <span className="text-xs-muted" style={{ fontSize: "0.65rem" }}>
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    {c.resumeUrl ? (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(c.resumeUrl, "_blank")}
                        icon={<CustomIcon name="FileText" size={15} />}
                        style={{ padding: "4px 8px", minHeight: "auto", fontSize: "0.8rem", color: "var(--accent-primary)" }}
                      >
                        Resume
                      </CustomButton>
                    ) : (
                      <span className="text-xs-muted">No Resume</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StandardListLayout>

      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={candidates.find((c: any) => c.id === currentEditingId)}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Candidate"
        message="Are you sure you want to delete this candidate? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <ConfirmationModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setCandidateToConvert(null);
        }}
        onConfirm={confirmConvert}
        title="Convert Candidate to User"
        message="Are you sure you want to convert this hired candidate into a system user?"
        confirmText="Convert"
        type="info"
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          setIsBulkModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
        }}
      />
    </>
  );
};

export default CandidateList;
