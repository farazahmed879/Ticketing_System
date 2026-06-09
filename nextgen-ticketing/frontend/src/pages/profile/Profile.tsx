import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import styles from "./Profile.module.css";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import { RoleName } from "../../utils/constants";

const Profile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (id) {
          const res = await api.get(API_ROUTES.USERS.BY_ID(id));
          setUser(res.data.account);
        } else {
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, currentUser]);

  if (loading) return <DetailSkeleton />;
  if (!user)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>User not found</div>
    );

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Back Button (Only if viewing another user) */}
      {id && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            marginBottom: 8,
          }}
        >
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/users")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{
              width: 40,
              height: 40,
              padding: 0,
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-glass)",
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              User Profile
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              Detailed overview of team member information
            </p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div
        className="glass-card"
        style={{
          padding: "30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 800,
              color: "white",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
            }}
          >
            {user.fullname.charAt(0)}
          </div>
          <div>
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {user.fullname}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "1.1rem",
                  fontWeight: 500,
                }}
              >
                {user.title || user.role?.name}
              </span>
              <CustomBadge
                variant={(():
                  | "danger"
                  | "primary"
                  | "warning"
                  | "success"
                  | "info"
                  | "neutral" => {
                  switch (user.role?.name?.toLowerCase()) {
                    case "admin":
                      return "danger";
                    case "manager":
                      return "primary";
                    case "hr":
                      return "warning";
                    case "employee":
                      return "success";
                    case "client":
                    case "customer":
                      return "info";
                    default:
                      return "neutral";
                  }
                })()}
              >
                {user.role?.name}
              </CustomBadge>
              {user.employeeType && (
                <CustomBadge variant="success">{user.employeeType}</CustomBadge>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {user.primaryResumeUrl && (
            <CustomButton
              variant="gradient"
              onClick={() => window.open(user.primaryResumeUrl, "_blank")}
              icon={<CustomIcon name="FileText" size={20} />}
            >
              View Resume
            </CustomButton>
          )}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}
      >
        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Bio / About */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <CustomIcon name="User" size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                About
              </h3>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                fontSize: "1rem",
              }}
            >
              {user.bio ||
                `Dedicated ${user.title || "professional"} focused on delivering exceptional performance and contributing to the team's success.`}
            </p>
          </div>

          {/* Professional Information */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <CustomIcon
                name="Briefcase"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Professional Details
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div className={styles.infoItem}>
                <label>Department</label>
                <span>{user.department?.name || "Operations"}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Branch / Location</label>
                <span>{user.branch || user.location || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Joining Date</label>
                <span>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label>
                  {user.role.name === RoleName.CUSTOMER
                    ? "Client ID"
                    : "Employee ID"}
                </label>
                <span>#{user.id.toString().slice(-6).toUpperCase()}</span>
              </div>
              {user.role?.name !== RoleName.CUSTOMER && (
                <div className={styles.infoItem}>
                  <label>Leave Balance</label>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CustomIcon
                      name="Calendar"
                      size={16}
                      color="var(--accent-primary)"
                    />
                    <strong style={{ fontSize: "1.05rem" }}>
                      {user.leaves ?? 0}
                    </strong>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      days remaining
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <CustomIcon
                name="Shield"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Personal Information
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div className={styles.infoItem}>
                <label>Full Name</label>
                <span>{user.fullname}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Username</label>
                <span>@{user.username}</span>
              </div>
              <div className={styles.infoItem}>
                <label>CNIC</label>
                <span>{user.cnic || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Nationality</label>
                <span>{user.nationality || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Contact Info */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Contact Information
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon name="Mail" size={18} color="var(--text-muted)" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    EMAIL
                  </span>
                  <span style={{ fontSize: "0.95rem" }}>{user.email}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon name="Phone" size={18} color="var(--text-muted)" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    PRIMARY CONTACT
                  </span>
                  <span style={{ fontSize: "0.95rem" }}>
                    {user.primaryContact || "-"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon
                  name="Smartphone"
                  size={18}
                  color="var(--text-muted)"
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    SECONDARY CONTACT
                  </span>
                  <span style={{ fontSize: "0.95rem" }}>
                    {user.secondaryContact || "-"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon name="MapPin" size={18} color="var(--text-muted)" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    ADDRESS
                  </span>
                  <span style={{ fontSize: "0.95rem" }}>
                    {user.address || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Social / Professional Links */}
          {(user.linkedInUrl || user.gitUrl) && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: 20,
                }}
              >
                Social Links
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {user.linkedInUrl && (
                  <a
                    href={user.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-glass)",
                    }}
                  >
                    <CustomIcon name="Linkedin" size={18} color="#0077b5" />{" "}
                    LinkedIn Profile
                  </a>
                )}
                {user.gitUrl && (
                  <a
                    href={user.gitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-glass)",
                    }}
                  >
                    <CustomIcon name="Github" size={18} /> GitHub Repository
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {user.emergencyContact && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Emergency Contact
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                {user.emergencyContact}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
