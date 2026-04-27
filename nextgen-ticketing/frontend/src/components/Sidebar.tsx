import styles from "./Sidebar.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import CustomIcon, { type IconName } from "./CustomIcon";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems: { icon: IconName; label: string; path: string; active?: boolean }[] = [
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
    { icon: "Users", label: "Projects", path: "/groups" },
    { icon: "UserSearch", label: "Candidates", path: "/candidates" },
    { icon: "CalendarCheck", label: "Interviews", path: "/interviews" },
    { icon: "Settings", label: "Settings", path: "/settings" },
    { icon: "Clock", label: "Timesheet", path: "/timesheet" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon} />
        <span>NextGen</span>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item, index) => {
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
        <button className={styles.navItem}>
          <CustomIcon name="LogOut" size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
