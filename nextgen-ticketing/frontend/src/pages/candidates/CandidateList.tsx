import React, { useEffect, useRef, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import styles from "./CandidateList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { CandidateStatus, UIMessages, DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useNavigate, Link } from "react-router-dom";
import type { Candidate } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";

import CandidateModal from "./components/CandidateModal";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getCandidateColumns } from "./columns";

const CandidateList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();

  // Pagination & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [candidateToConvert, setCandidateToConvert] = useState<string | null>(null);

  // Tracks the filter values that were last submitted via Enter/Filter button.
  // Used to detect when an applied text filter is cleared so we can auto-refetch.
  const activeFiltersRef = useRef({
    search: "",
    position: "",
    skills: "",
    aiPrompt: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.CANDIDATES.BASE, {
        params: {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: !isAiMode && searchTerm ? searchTerm : undefined,
          position: !isAiMode && positionFilter ? positionFilter : undefined,
          skills: !isAiMode && skillsFilter ? skillsFilter : undefined,
          aiPrompt: isAiMode && aiPrompt ? aiPrompt : undefined,
          limit: itemsPerPage,
          page: currentPage,
        },
      });
      setCandidates(res.data.candidates);
      setTotalItems(res.data.total);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
      showNotification("error", "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [statusFilter, currentPage, itemsPerPage]);

  // Auto-refetch when a previously-applied text filter is cleared via keyboard,
  // so users don't have to click Filter again to see the unfiltered list.
  useEffect(() => {
    const active = activeFiltersRef.current;
    const filterCleared =
      (active.search && !searchTerm) ||
      (active.position && !positionFilter) ||
      (active.skills && !skillsFilter) ||
      (active.aiPrompt && !aiPrompt);
    if (!filterCleared) return;
    activeFiltersRef.current = {
      search: searchTerm,
      position: positionFilter,
      skills: skillsFilter,
      aiPrompt: aiPrompt,
    };
    setCurrentPage(0);
    fetchData();
  }, [searchTerm, positionFilter, skillsFilter, aiPrompt]);

  const handleSearch = () => {
    setCurrentPage(0);
    activeFiltersRef.current = {
      search: searchTerm,
      position: positionFilter,
      skills: skillsFilter,
      aiPrompt: aiPrompt,
    };
    fetchData();
  };

  const handleFormSubmit = async (payload: any) => {
    setIsSubmitting(true);
    try {
      if (currentEditingId) {
        await api.put(API_ROUTES.CANDIDATES.BY_ID(currentEditingId), payload);
        showNotification("success", "Candidate updated successfully");
      } else {
        await api.post(API_ROUTES.CANDIDATES.BASE, payload);
        showNotification("success", "Candidate created successfully");
      }
      setIsModalOpen(false);
      setCurrentEditingId(null);
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to save candidate",
      );
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
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.CANDIDATES.BY_ID(candidateToDelete));
      showNotification("success", "Candidate deleted successfully");
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification("error", "Failed to delete candidate");
    } finally {
      setIsLoading(false, "");
      setCandidateToDelete(null);
    }
  };

  const handleConvertClick = (id: string) => {
    setCandidateToConvert(id);
    setIsConvertModalOpen(true);
  };

  const confirmConvert = async () => {
    if (!candidateToConvert) return;
    setIsLoading(true, "Converting candidate...");
    try {
      await api.post(API_ROUTES.CANDIDATES.CONVERT(candidateToConvert));
      showNotification("success", "Candidate converted to user successfully");
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to convert candidate",
      );
    } finally {
      setIsLoading(false, "");
      setIsConvertModalOpen(false);
      setCandidateToConvert(null);
    }
  };

  const columns = getCandidateColumns(handleConvertClick, setCurrentEditingId, setIsModalOpen, handleDelete, isAiMode);

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
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                Candidates
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage interview candidates and their profiles
              </p>
            </div>
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
        }
        filters={
          <div
            className="glass-card"
            style={{
              padding: "16px",
              marginBottom: "16px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Filters</h3>
                <CustomBadge variant={isAiMode ? "primary" : "neutral"}>
                  {isAiMode ? "AI Search Active" : "Standard Search"}
                </CustomBadge>
              </div>
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
                  if (!isAiMode) {
                    setSearchTerm("");
                    setPositionFilter("");
                    setSkillsFilter("");
                  } else {
                    setAiPrompt("");
                  }
                }}
              >
                {isAiMode ? "Disable AI Match" : "Enable AI Match"}
              </CustomButton>
            </div>

            {isAiMode ? (
              <div
                style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}
              >
                <div style={{ flex: 1 }}>
                  <CustomInput
                    label="AI Natural Language Query"
                    placeholder="e.g., Senior React developer with strong communication skills..."
                    value={aiPrompt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAiPrompt(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                      e.key === "Enter" && handleSearch()
                    }
                    icon={<CustomIcon name="Search" size={18} />}
                  />
                </div>
                <CustomButton
                  variant="primary"
                  onClick={handleSearch}
                  style={{ height: "48px" }}
                >
                  Analyze
                </CustomButton>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 200px auto",
                  gap: "16px",
                  alignItems: "end",
                }}
              >
                <CustomInput
                  label="Search Name/Email"
                  placeholder="e.g. John Doe"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && handleSearch()
                  }
                  icon={<CustomIcon name="Search" size={18} />}
                />
                <CustomInput
                  label="Position"
                  placeholder="e.g. Frontend Dev"
                  value={positionFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPositionFilter(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && handleSearch()
                  }
                />
                <CustomInput
                  label="Technical Skills"
                  placeholder="e.g. React, Node.js"
                  value={skillsFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSkillsFilter(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && handleSearch()
                  }
                />
                <CustomSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(0);
                  }}
                  placeholder="All Statuses"
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: CandidateStatus.ACTIVE, label: "Active" },
                    { value: CandidateStatus.HIRED, label: "Hired" },
                    { value: CandidateStatus.REJECTED, label: "Rejected" },
                    { value: CandidateStatus.ON_HOLD, label: "On Hold" },
                  ]}
                />
                <CustomButton
                  variant="secondary"
                  onClick={handleSearch}
                  icon={<CustomIcon name="Filter" size={18} />}
                  style={{ height: "48px" }}
                >
                  Filter
                </CustomButton>
              </div>
            )}
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
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={candidates}
          loading={loading}
          loadingMessage="Loading candidates..."
          emptyMessage="No candidates found"
          onRowClick={(c) => navigate(`/candidates/${c.id}`)}
        />
      </StandardListLayout>

      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={candidates.find((c) => c.id === currentEditingId)}
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
    </>
  );
};

export default CandidateList;
