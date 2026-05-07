import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomIcon from "../CustomIcon";
import { useAuth } from "../../context/AuthContext";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const hasPermission = (permPath: string) => {
    if (!user || !user.role || !user.role.permissions) return false;
    // Admins always have access
    if (user.role.name === "Admin") return true;

    const [module, action] = permPath.split(".");
    return user.role.permissions?.[module]?.[action] === true;
  };

  const navItems = [
    {
      icon: <CustomIcon name="LayoutDashboard" size={20} />,
      label: t("sidebar.dashboard"),
      path: "/",
      permission: "dashboard.view",
    },
    {
      icon: <CustomIcon name="Ticket" size={20} />,
      label: t("sidebar.tickets"),
      path: "/tickets",
      permission: "tickets.view",
    },
    {
      icon: <CustomIcon name="LayoutGrid" size={20} />,
      label: t("sidebar.ticketBoard"),
      path: "/tickets/board",
      permission: "tickets.view",
    },
    {
      icon: <CustomIcon name="FileQuestion" size={20} />,
      label: t("sidebar.requests"),
      path: "/requests",
      permission: "requests.view",
    },
    {
      icon: <CustomIcon name="MessageSquare" size={20} />,
      label: t("sidebar.messages"),
      path: "/messages",
      permission: "messages.view",
    },
    {
      icon: <CustomIcon name="ShieldCheck" size={20} />,
      label: t("sidebar.teams"),
      path: "/teams",
      permission: "teams.view",
    },
    {
      icon: <CustomIcon name="Users2" size={20} />,
      label: t("sidebar.departments"),
      path: "/departments",
      permission: "departments.view",
    },
    {
      icon: <CustomIcon name="Layers" size={20} />,
      label: t("sidebar.projects"),
      path: "/projects",
      permission: "projects.view",
    },
    {
      icon: <CustomIcon name="Users" size={20} />,
      label: t("sidebar.users"),
      path: "/users",
      permission: "users.view",
    },
    {
      icon: <CustomIcon name="Shield" size={20} />,
      label: t("sidebar.roles"),
      path: "/roles",
      permission: "roles.view",
    },
    {
      icon: <CustomIcon name="Clock" size={20} />,
      label: t("sidebar.timesheet"),
      path: "/timesheet",
      permission: "timesheets.view",
    },
    {
      icon: <CustomIcon name="UserPlus" size={20} />,
      label: t("sidebar.candidates"),
      path: "/candidates",
      permission: "candidates.view",
    },
    {
      icon: <CustomIcon name="CalendarCheck" size={20} />,
      label: t("sidebar.interviews"),
      path: "/interviews",
      permission: "interviews.view",
    },
    {
      icon: <CustomIcon name="Megaphone" size={20} />,
      label: t("sidebar.announcements"),
      path: "/announcements",
      permission: "announcements.view",
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    hasPermission(item.permission),
  );

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}
    >
      <button
        className={styles.collapseToggle}
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <CustomIcon name="ChevronRight" size={16} />
        ) : (
          <CustomIcon name="ChevronLeft" size={16} />
        )}
      </button>

      <div className={styles.logo}>
        <img
          src="/logo-sq.png"
          alt="Logo"
          style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
        />
        {!isCollapsed && (
          <span style={{ color: "forestgreen", fontWeight: 700 }}>
            Jami Partners
          </span>
        )}
      </div>

      <nav className={styles.nav}>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/tickets"}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div
        className={styles.userProfile}
        onClick={() => navigate("/profile")}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.avatar}>
          <CustomIcon name="User" size={20} color="var(--text-secondary)" />
        </div>
        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.userName}>{user?.fullname}</div>
            <div className={styles.userTitle}>
              {user?.title || user?.role?.name}
            </div>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          className={styles.logoutBtn}
          title={t("sidebar.logout")}
        >
          <CustomIcon name="LogOut" size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
