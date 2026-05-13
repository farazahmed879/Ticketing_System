import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import { CandidateStatus } from "../../utils/constants";
import { useNavigate } from "react-router-dom";
import type { TableColumn } from "../../components/types";

interface LeaderboardEntry {
  id: string;
  name: string;
  position: string;
  status: string;
  averageRating: number;
  interviewCount: number;
  feedbackCount: number;
  topRecommendation: string;
  lastInterviewDate: string | null;
}

const CandidateLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.CANDIDATES.LEADERBOARD);
      setData(res.data.leaderboard);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
      showNotification("error", "Failed to load hiring leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700, #FFA500)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800,
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.4)'
          }}>
            1
          </div>
        );
      case 1:
        return (
          <div style={{ 
            width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #C0C0C0, #808080)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700
          }}>
            2
          </div>
        );
      case 2:
        return (
          <div style={{ 
            width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #CD7F32, #8B4513)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700
          }}>
            3
          </div>
        );
      default:
        return <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginLeft: 10 }}>{index + 1}</span>;
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "Strong Hire": return "var(--accent-success)";
      case "Hire": return "#10b981";
      case "Neutral": return "var(--text-muted)";
      case "No Hire": return "var(--accent-danger)";
      case "Strong No Hire": return "#ef4444";
      default: return "var(--text-muted)";
    }
  };

  const columns: TableColumn<LeaderboardEntry>[] = [
    {
      header: "Rank",
      key: "rank",
      render: (_, index) => getRankBadge(index!),
      width: "80px"
    },
    {
      header: "Candidate",
      key: "name",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, background: 'var(--bg-input)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.2rem', fontWeight: 600, border: '1px solid var(--border-glass)'
          }}>
            {item.name.charAt(0)}
          </div>
          <div>
            <div 
              onClick={() => navigate(`/candidates/${item.id}`)}
              style={{ fontWeight: 600, cursor: 'pointer' }}
              className="hover-glow"
            >
              {item.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.position}</div>
          </div>
        </div>
      )
    },
    {
      header: "Avg. Rating",
      key: "averageRating",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border-glass)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderColor: item.averageRating >= 4 ? 'var(--accent-success)' : item.averageRating >= 3 ? 'var(--accent-primary)' : 'var(--border-glass)'
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{item.averageRating}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <CustomIcon 
                  key={star} 
                  name="Star" 
                  size={12} 
                  color={star <= Math.round(item.averageRating) ? '#FFD700' : 'rgba(255,255,255,0.1)'} 
                  style={{ fill: star <= Math.round(item.averageRating) ? '#FFD700' : 'transparent' }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>from {item.feedbackCount} reviews</span>
          </div>
        </div>
      )
    },
    {
        header: "Interviews",
        key: "interviewCount",
        render: (item) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CustomIcon name="Calendar" size={14} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600 }}>{item.interviewCount} Sessions</span>
             </div>
             {item.lastInterviewDate && (
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                 Last: {new Date(item.lastInterviewDate).toLocaleDateString()}
               </span>
             )}
          </div>
        )
    },
    {
      header: "Top Recommendation",
      key: "topRecommendation",
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getRecommendationColor(item.topRecommendation) }} />
          <span style={{ fontWeight: 500, color: getRecommendationColor(item.topRecommendation) }}>
            {item.topRecommendation}
          </span>
        </div>
      )
    },
    {
      header: "Current Status",
      key: "status",
      render: (item) => (
        <CustomBadge variant={
          item.status === CandidateStatus.HIRED ? "success" : 
          item.status === CandidateStatus.REJECTED ? "danger" : "primary"
        }>
          {item.status}
        </CustomBadge>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
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
              Hiring Leaderboard
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: '0.9rem' }}>
              Top performing candidates based on interview feedback and ratings
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-primary)' }}>
              <CustomIcon name="Trophy" size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Candidate Rankings</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Updated in real-time as feedback is submitted</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{data.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Candidates</div>
            </div>
            <div style={{ width: 1, background: 'var(--border-glass)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-success)' }}>
                {data.filter(c => c.status === CandidateStatus.HIRED).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Successfully Hired</div>
            </div>
          </div>
        </div>
        
        <CustomTable
          columns={columns}
          data={data}
          loading={loading}
          loadingMessage="Calculating rankings..."
          emptyMessage="No interview feedback available yet to rank candidates"
        />
      </div>
    </div>
  );
};

export default CandidateLeaderboard;
