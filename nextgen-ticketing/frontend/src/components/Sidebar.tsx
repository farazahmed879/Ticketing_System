import {
  LayoutDashboard,
  Ticket,
  LayoutGrid,
  MessageSquare,
  History,
  Settings,
  Users,
  LogOut,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      active: true,
      path: "/dashboard",
    },
    { icon: Ticket, label: "Tickets", path: "/tickets" },
    { icon: LayoutGrid, label: "Ticket Board", path: "/tickets/board" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: History, label: "History", path: "/history" },
    { icon: Users, label: "Team", path: "/team" },
    { icon: Settings, label: "Settings", path: "/settings" },
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
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.navItem}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
