import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import CustomButton from "../../../components/CustomButton";
import type { Candidate } from "../../../types";
import { DetailSkeleton } from "../../../components/CustomSkeleton/CustomSkeleton";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { CandidateDetailHeader } from "./CandidateDetailHeader.tsx";
import { CandidateProfileTab } from "./CandidateProfileTab.tsx";
import { CandidateHiringTab } from "./CandidateHiringTab.tsx";

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "hiring">("profile");

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await api.get(API_ROUTES.CANDIDATES.BY_ID(id!));
        setCandidate(res.data.candidate);
      } catch (err) {
        console.error("Failed to fetch candidate details", err);
        showNotification("error", "Failed to load candidate details");
        navigate("/candidates");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id, navigate, showNotification]);

  const handleConvert = () => {
    if (!candidate) return;
    setIsConvertModalOpen(true);
  };

  const confirmConvert = async () => {
    if (!candidate) return;
    setIsConverting(true);
    try {
      const res = await api.post(API_ROUTES.CANDIDATES.CONVERT(id!));
      if (res.data.success) {
        showNotification(
          "success",
          `Candidate converted successfully! Temporary password: ${res.data.tempPassword}`,
        );
        setCandidate({ ...candidate, isConverted: true });
      }
    } catch (err: any) {
      console.error("Conversion failed", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to convert candidate",
      );
    } finally {
      setIsConverting(false);
      setIsConvertModalOpen(false);
    }
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
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/candidates")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{ 
              width: 40, 
              height: 40, 
              padding: 0, 
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              Candidate Details
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: '0.9rem' }}>
              Detailed profile and hiring history
            </p>
          </div>
        </div>
      </div>

      <CandidateDetailHeader
        candidate={candidate}
        isConverting={isConverting}
        onConvert={handleConvert}
      />

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border-glass)",
          padding: "0 10px",
        }}
      >
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "profile"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color:
              activeTab === "profile"
                ? "var(--accent-primary)"
                : "var(--text-muted)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            fontSize: "1rem",
          }}
        >
          Candidate Profile
        </button>
        <button
          onClick={() => setActiveTab("hiring")}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "hiring"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color:
              activeTab === "hiring"
                ? "var(--accent-primary)"
                : "var(--text-muted)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            fontSize: "1rem",
          }}
        >
          Hiring Process
        </button>
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
        loading={isConverting}
      />
    </div>
  );
};

export default CandidateDetail;
