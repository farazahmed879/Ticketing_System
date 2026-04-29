import styles from "./Sidebar.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import CustomIcon, { type IconName } from "./CustomIcon";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const menuItems: { icon: IconName; label: string; path: string; active?: boolean; permissions?: string[] }[] = [
    {
      icon: "LayoutDashboard",
      label: "Dashboard",
      active: true,
      path: "/dashboard",
    },
    { icon: "Ticket", label: "Tickets", path: "/tickets" },
    { icon: "LayoutGrid", label: "Ticket Board", path: "/tickets/board" },
    { icon: "MessageSquare", label: "Chat", path: "/chat" },
    { icon: "History", label: "History", path: "/history" },
    { icon: "Building2", label: "Departments", path: "/departments", permissions: ["isAdmin"] },
    { icon: "Users", label: "Teams", path: "/teams", permissions: ["isAdmin"] },
    { icon: "FolderKanban", label: "Projects", path: "/projects", permissions: ["isAdmin"] },
    { 
      icon: "UserSearch", 
      label: "Candidates", 
      path: "/candidates",
      permissions: ["isAdmin", "isAgent", "isHR"]
    },
    { 
      icon: "Trophy", 
      label: "Leaderboard", 
      path: "/candidates/leaderboard",
      permissions: ["isAdmin", "isAgent", "isHR"]
    },
    { 
      icon: "CalendarCheck", 
      label: "Interviews", 
      path: "/interviews",
      permissions: ["isAdmin", "isAgent", "isHR"]
    },
    { icon: "Settings", label: "Settings", path: "/settings" },
    { icon: "Clock", label: "Timesheet", path: "/timesheet" },
  ];

  const filteredItems = menuItems.filter(item => {
    if (!item.permissions) return true;
    if (!user || !user.role) return false;
    
    // Check if any of the required permission flags are true
    return item.permissions.some(perm => (user.role as any)[perm] === true);
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon} />
        <span>NextGen</span>
      </div>

      <nav className={styles.nav}>
        {filteredItems.map((item, index) => {
          const isActive =
            item.path === "/tickets"
              ? location.pathname === "/tickets"
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={index}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              onClick={() => navigate(item.path)}
            >
              <CustomIcon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.navItem} onClick={() => navigate("/logout")}>
          <CustomIcon name="LogOut" size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
