import React, { useEffect, useState, useMemo } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import type { Team, User, Department, Project } from "../../types";
import type { TableColumn } from "../../components/types";
import TeamModal from "./components/TeamModal";

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const { showNotification, setIsLoading } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, deptsRes, projectsRes, usersRes] = await Promise.all([
        api.get(API_ROUTES.TEAMS.BASE),
        api.get(API_ROUTES.DEPARTMENTS.BASE),
        api.get(API_ROUTES.PROJECTS.BASE),
        api.get(API_ROUTES.USERS.BASE + "?limit=1000") // Get all users for member selection
      ]);
      setTeams(teamsRes.data.teams || teamsRes.data.accounts || []); // Match backend response key
      setDepartments(deptsRes.data.departments);
      setProjects(projectsRes.data.projects);
      setUsers(usersRes.data.accounts);
    } catch (err) {
      console.error("Failed to fetch teams data", err);
      showNotification("error", "Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [teams, search]);

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TEAMS.BY_ID(id));
      showNotification("success", "Team deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to delete team");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true, editingTeam ? "Updating team..." : "Creating team...");
    try {
      if (editingTeam) {
        await api.put(API_ROUTES.TEAMS.BY_ID(editingTeam.id), data);
        showNotification("success", "Team updated successfully");
      } else {
        await api.post(API_ROUTES.TEAMS.BASE, data);
        showNotification("success", "Team created successfully");
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      fetchData();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Operation failed");
    } finally {
      setIsLoading(false, "");
    }
  };

  const columns: TableColumn<Team>[] = [
    {
      header: "Team Name",
      key: "name",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="glass-card" style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)' }}>
            <CustomIcon name="Users" size={18} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.description || "Internal team"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Department",
      key: "department",
      render: (t) => (
        <span style={{ fontSize: "0.9rem", color: "var(--accent-primary)", fontWeight: 500 }}>
          {t.department?.name || "N/A"}
        </span>
      ),
    },
    {
      header: "Members",
      key: "members",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", marginLeft: 4 }}>
            {t.members?.slice(0, 3).map((m, idx) => (
              <div 
                key={m.id} 
                style={{ 
                    width: 24, height: 24, borderRadius: "50%", background: "var(--bg-input)", 
                    border: "2px solid var(--bg-card)", marginLeft: idx === 0 ? 0 : -8,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700
                }}
                title={m.fullname}
              >
                {m.image ? <img src={m.image} alt={m.fullname} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : m.fullname.charAt(0)}
              </div>
            ))}
            {t.members && t.members.length > 3 && (
              <div style={{ 
                  width: 24, height: 24, borderRadius: "50%", background: "var(--border-glass)", 
                  border: "2px solid var(--bg-card)", marginLeft: -8,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "var(--text-muted)" 
              }}>
                +{t.members.length - 3}
              </div>
            )}
            {(!t.members || t.members.length === 0) && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>0 members</span>}
          </div>
        </div>
      ),
    },
    {
        header: "Projects",
        key: "projects",
        render: (t) => (
          <span style={{ fontSize: "0.9rem" }}>{t.projects?.length || 0} Assigned</span>
        ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (t) => (
        <div style={{ display: "flex", gap: 8 }}>
          <CustomButton variant="ghost" size="sm" onClick={() => handleEdit(t)} icon={<CustomIcon name="Edit2" size={16} />} />
          <CustomButton variant="ghost" size="sm" onClick={() => handleDelete(t.id)} icon={<CustomIcon name="Trash2" size={16} />} style={{ color: "var(--accent-danger)" }} />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Teams</h1>
          <p style={{ color: "var(--text-muted)" }}>Manage cross-functional teams and projects</p>
        </div>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={() => {
            setEditingTeam(null);
            setIsModalOpen(true);
          }}
        >
          Add Team
        </CustomButton>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <CustomInput
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<CustomIcon name="Search" size={18} />}
          containerStyle={{ maxWidth: "350px" }}
        />
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <CustomTable
          columns={columns}
          data={filteredTeams}
          loading={loading}
          loadingMessage="Loading teams..."
          emptyMessage="No teams found"
        />
      </div>

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        team={editingTeam}
        departments={departments}
        projects={projects}
        users={users}
      />
    </div>
  );
};

export default TeamList;
