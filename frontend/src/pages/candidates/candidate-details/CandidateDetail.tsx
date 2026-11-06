import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import CustomButton from "../../../components/CustomButton";
import { DetailSkeleton } from "../../../components/CustomSkeleton/CustomSkeleton";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { CandidateDetailHeader } from "./CandidateDetailHeader.tsx";
import { CandidateProfileTab } from "./CandidateProfileTab.tsx";
import { CandidateHiringTab } from "./CandidateHiringTab.tsx";
import styles from "./CandidateDetail.module.css";

const CandidateDetail: React.FC = () => {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "hiring">("profile");

  const { data: candidateData, isLoading: loading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const res = await api.get(API_ROUTES.CANDIDATES.BY_ID(id));
        return res.data.candidate;
      } catch (err) {
        console.error("Failed to fetch candidate details", err);
        showNotification("error", "Failed to load candidate details");
        navigate("/candidates");
        throw err;
      }
    },
    enabled: !!id,
  });

  const candidate = candidateData || null;

  const handleConvert = () => {
    if (!candidate) return;
    setIsConvertModalOpen(true);
  };

  const convertMutation = useMutation({
    mutationFn: async () => {
      return api.post(API_ROUTES.CANDIDATES.CONVERT(id!));
    },
    onSuccess: (res) => {
      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ["candidate", id] });
        queryClient.invalidateQueries({ queryKey: ["candidates"] });
        showNotification(
          "success",
          `Candidate converted successfully! Temporary password: ${res.data.tempPassword}`
        );
      }
      setIsConvertModalOpen(false);
    },
    onError: (err: any) => {
      console.error("Conversion failed", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to convert candidate"
      );
      setIsConvertModalOpen(false);
    },
  });

  const confirmConvert = async () => {
    if (!candidate) return;
    convertMutation.mutate();
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!candidate) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Candidate not found.
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${styles.page}`}>

      <CandidateDetailHeader
        candidate={candidate}
        isConverting={convertMutation.isPending}
        onConvert={handleConvert}
      />

      {/* Tabs Navigation */}
      <div className={styles.tabs}>
        <CustomButton
          onClick={() => setActiveTab("profile")}
          variant="ghost"
          className={styles.tab}
          style={{
            borderBottom:
              activeTab === "profile"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color: activeTab === "profile" ? "var(--accent-primary)" : "var(--text-muted)"
          }}
        >
          Candidate Profile
        </CustomButton>
        <CustomButton
          onClick={() => setActiveTab("hiring")}
          variant="ghost"
          className={styles.tab}
          style={{
            borderBottom:
              activeTab === "hiring"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color: activeTab === "hiring" ? "var(--accent-primary)" : "var(--text-muted)"
          }}
        >
          Hiring Process
        </CustomButton>
      </div>

      {activeTab === "profile" ? (
        <CandidateProfileTab candidate={candidate} />
      ) : (
        <CandidateHiringTab candidate={candidate} />
      )}

      <ConfirmationModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConfirm={confirmConvert}
        title="Convert Candidate to User"
        message={`Are you sure you want to convert ${candidate?.name} into a system user?`}
        confirmText="Convert"
        type="info"
        loading={convertMutation.isPending}
      />
    </div>
  );
};

export default CandidateDetail;
