import React, { useRef, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomIcon from "../CustomIcon";
import ConfirmationModal from "../ConfirmationModal";
import { useAuth } from "../../context/AuthContext";
import styles from "./Sidebar.module.css";

import type { SidebarProps } from "../../types";
import CustomImage from "../CustomImage";
import { ROLE_TYPE } from "../../pages/roles/roleConstants";

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  unreadMessageCount,
  unreadShoutoutCount,
  isMobile = false,
  isMobileOpen = false,
  onMobileOpenChange,
}) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCustomer = user?.role?.roleType === ROLE_TYPE.CUSTOMER;

  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<{
    item: any;
    top: number;
  } | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    top: number;
  } | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(Math.ceil(scrollTop + clientHeight) < scrollHeight);
    }
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const observer = new ResizeObserver(() => checkScroll());
    // Observe all children to catch submenu expansions
    Array.from(nav.children).forEach((child) => observer.observe(child));
    observer.observe(nav);

    nav.addEventListener("scroll", checkScroll);
    checkScroll();

    return () => {
      observer.disconnect();
      nav.removeEventListener("scroll", checkScroll);
    };
  }, [isCollapsed, isMobileOpen]);

  const scrollUp = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ top: -150, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ top: 150, behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate("/login");
  };

  const hasPermission = (permPath: string) => {
    if (!user || !user.role || !user.role.permissions) return false;
    // Admins always have access
    if (user.role.roleType === ROLE_TYPE.ADMIN) return true;

    const [module, action] = permPath.split(".");
    return user.role.permissions?.[module]?.[action] === true;
  };

  interface NavItemType {
    icon: React.ReactNode;
    label: string;
    path: string;
    permission: string;
    children?: { label: string; path: string }[];
  }

  const navItems: NavItemType[] = [
    {
      icon: <CustomIcon name="LayoutDashboard" size={20} />,
      label: t("sidebar.dashboard"),
      path: "/",
      permission: "dashboard.view",
    },
    {
      icon: <CustomIcon name="Ticket" size={20} />,
      label: "Tickets",
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
      permission: "groups.view",
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
      label: isCustomer ? t("sidebar.reviews", "Reviews") : t("sidebar.announcements"),
      path: "/announcements",
      permission: "announcements.view",
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
  ];

  const filteredNavItems = navItems.filter((item) =>
    hasPermission(item.permission),
  );

  // On phones the sidebar is an off-canvas drawer (opened from the topbar
  // hamburger) that always shows full labels. Desktop keeps the
  // user-controlled collapse.
  const collapsed = isMobile ? false : isCollapsed;
  const closeMobile = () => {
    if (isMobile) onMobileOpenChange?.(false);
  };

  return (
    <>
    {isMobile && isMobileOpen && (
      <div
        className={styles.mobileBackdrop}
        onClick={closeMobile}
        aria-hidden="true"
      />
    )}
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""} ${isMobile ? styles.sidebarMobile : ""} ${isMobile && isMobileOpen ? styles.sidebarMobileOpen : ""}`}
      aria-label="Main navigation"
      aria-hidden={isMobile && !isMobileOpen ? true : undefined}
      inert={isMobile && !isMobileOpen ? true : undefined}
    >
      {!isMobile && (
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
      )}

      <div className={styles.logo}>
        <CustomImage
          src="/InsigniaStandalone.svg"
          alt="Logo"
          style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
        />
        {!collapsed && (
          <span style={{ color: "forestgreen", fontWeight: 700 }}>
            Jami Partners
          </span>
        )}
        {isMobile && (
          <button
            type="button"
            className={styles.mobileCloseBtn}
            onClick={closeMobile}
            aria-label="Close menu"
            aria-expanded={true}
          >
            <CustomIcon name="X" size={18} />
          </button>
        )}
      </div>

      {canScrollUp && (
        <button className={styles.scrollBtn} onClick={scrollUp}>
          <CustomIcon name="ChevronUp" size={16} />
        </button>
      )}

      <nav className={styles.nav} ref={navRef}>
        {filteredNavItems.map((item) => (
          <div
            key={item.path}
            className={styles.navItemWrapper}
            onMouseEnter={(e) => {
              // Taps fire mouseenter on touch screens — skip hover popups there.
              if (isMobile) return;
              const rect = e.currentTarget.getBoundingClientRect();
              if (item.children) {
                setHoveredSubmenu({ item, top: rect.top });
              } else if (collapsed) {
                setHoveredTooltip({
                  label: item.label,
                  top: rect.top + rect.height / 2,
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredSubmenu(null);
              setHoveredTooltip(null);
            }}
          >
            <NavLink
              to={item.path}
              end={item.path === "/tickets"}
              onClick={closeMobile}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {item.path === "/messages" &&
                unreadMessageCount !== undefined &&
                unreadMessageCount > 0 && (
                  <span
                    className={`${styles.sidebarBadge} ${collapsed ? styles.collapsedBadge : ""}`}
                  >
                    {unreadMessageCount}
                  </span>
                )}
              {item.path === "/announcements" &&
                !!unreadShoutoutCount &&
                unreadShoutoutCount > 0 && (
                  <span
                    className={`${styles.sidebarBadge} ${collapsed ? styles.collapsedBadge : ""}`}
                    title={`${unreadShoutoutCount} new shoutout${unreadShoutoutCount === 1 ? "" : "s"}`}
                  >
                    {unreadShoutoutCount > 99 ? "99+" : unreadShoutoutCount}
                  </span>
                )}
              {item.children && !collapsed && (
                <CustomIcon
                  name="ChevronRight"
                  size={14}
                  style={{ marginLeft: "auto", opacity: 0.5 }}
                />
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {hoveredSubmenu && (
        <div
          className={styles.submenuFlyout}
          style={{
            top: hoveredSubmenu.top,
            left: isCollapsed ? 90 : 270,
          }}
          onMouseEnter={() => setHoveredSubmenu(hoveredSubmenu)}
          onMouseLeave={() => setHoveredSubmenu(null)}
        >
          <div className={styles.submenuHeader}>
            {hoveredSubmenu.item.label}
          </div>
          {hoveredSubmenu.item.children.map((child: any) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) =>
                `${styles.submenuLink} ${isActive ? styles.submenuLinkActive : ""}`
              }
              onClick={() => {
                setHoveredSubmenu(null);
                closeMobile();
              }}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}

      {hoveredTooltip && (
        <div
          className={styles.iconTooltip}
          style={{ top: hoveredTooltip.top }}
        >
          {hoveredTooltip.label}
        </div>
      )}

      {canScrollDown && (
        <button className={styles.scrollBtn} onClick={scrollDown}>
          <CustomIcon name="ChevronDown" size={16} />
        </button>
      )}

      <div
        className={styles.userProfile}
        onClick={() => {
          closeMobile();
          navigate("/profile");
        }}
        style={{
          cursor: "pointer",
          flexDirection: collapsed ? "column" : "row",
          gap: collapsed ? "16px" : "12px",
          justifyContent: "center",
        }}
      >
        <div className={styles.avatar}>
          <CustomIcon name="User" size={20} color="var(--text-secondary)" />
        </div>
        {!collapsed && (
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
            setIsLogoutModalOpen(true);
          }}
          className={styles.logoutBtn}
          title={t("sidebar.logout")}
        >
          <CustomIcon name="LogOut" size={18} />
        </button>
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title={t("sidebar.logout")}
        message={t(
          "logoutMessage",
          "Are you sure you want to log out of your account?",
        )}
        confirmText={t("sidebar.logout", "Logout")}
        type="danger"
      />
    </aside>
    </>
  );
};

export default Sidebar;
