import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { socket } from "../services/socket";
import CustomIcon from "../components/CustomIcon";
import styles from "./MainLayout.module.css";

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationOpen]);

  React.useEffect(() => {
    if (!user) return;

    // Request initial count and list
    socket.emit('notifications:get');

    // Listen for updates
    socket.on('notifications:update', (data: { count?: number; items?: any[] }) => {
      if (data.count !== undefined) setUnreadCount(data.count);
      if (data.items) setNotifications(data.items);
    });

    socket.on('notifications:new', (notification: any) => {
      showNotification('info', notification.title + ': ' + notification.message);
      
      // Play notification sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));

      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('notifications:update');
      socket.off('notifications:new');
    };
  }, [user, showNotification]);

  const handleMarkAsRead = async (id: string) => {
    socket.emit('notifications:markRead', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    socket.emit('notifications:markAllRead');
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const hasPermission = (permPath: string) => {
    if (!user || !user.role || !user.role.permissions) return false;
    // Admins always have access
    if (user.role.name === 'Admin') return true;
    
    const [module, action] = permPath.split('.');
    return user.role.permissions?.[module]?.[action] === true;
  };

  const navItems = [
    { icon: <CustomIcon name="LayoutDashboard" size={20} />, label: "Dashboard", path: "/", permission: "dashboard.view" },
    { icon: <CustomIcon name="Ticket" size={20} />, label: "Tickets", path: "/tickets", permission: "tickets.view" },
    { icon: <CustomIcon name="LayoutGrid" size={20} />, label: "Ticket Board", path: "/tickets/board", permission: "tickets.view" },
    { icon: <CustomIcon name="FileQuestion" size={20} />, label: "Requests", path: "/requests", permission: "requests.view" },
    { icon: <CustomIcon name="MessageSquare" size={20} />, label: "Messages", path: "/messages", permission: "messages.view" },
    { icon: <CustomIcon name="ShieldCheck" size={20} />, label: "Teams", path: "/teams", permission: "teams.view" },
    { icon: <CustomIcon name="Users2" size={20} />, label: "Departments", path: "/departments", permission: "departments.view" },
    { icon: <CustomIcon name="Layers" size={20} />, label: "Projects", path: "/groups", permission: "groups.view" },
    { icon: <CustomIcon name="Users" size={20} />, label: "Users", path: "/users", permission: "users.view" },
    { icon: <CustomIcon name="Shield" size={20} />, label: "Roles", path: "/roles", permission: "roles.view" },
    { icon: <CustomIcon name="Clock" size={20} />, label: "Timesheet", path: "/timesheet", permission: "timesheets.view" },
    { icon: <CustomIcon name="UserPlus" size={20} />, label: "Candidates", path: "/candidates", permission: "candidates.view" },
    { icon: <CustomIcon name="CalendarCheck" size={20} />, label: "Interviews", path: "/interviews", permission: "interviews.view" },
  ];

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className={`${styles.layout} ${isCollapsed ? styles.layoutCollapsed : ""}`}>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}>
        <button 
          className={styles.collapseToggle} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <CustomIcon name="ChevronRight" size={16} /> : <CustomIcon name="ChevronLeft" size={16} />}
        </button>
        <div className={styles.logo}>
          <img 
            src="/logo-sq.png" 
            alt="Logo" 
            style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} 
          />
          {!isCollapsed && <span className="text-gradient">Jami Partners</span>}
        </div>

        <nav className={styles.nav}>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/tickets'}
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
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.avatar}>
            <CustomIcon name="User" size={20} color="var(--text-secondary)" />
          </div>
          {!isCollapsed && <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.fullname}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {user?.title || user?.role?.name}
            </div>
          </div>}
          <button
            onClick={handleLogout}
            style={{ background: "transparent", color: "var(--text-muted)", flexShrink: 0 }}
          >
            <CustomIcon name="LogOut" size={18} />
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={`${styles.topbar} ${scrolled ? styles.topbarScrolled : ""}`}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Overview</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }} ref={notificationRef}>
            <div style={{ position: "relative" }}>
              <button
                className="glass-card"
                style={{ padding: 8, borderRadius: 10, position: "relative", cursor: 'pointer' }}
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <CustomIcon name="Bell" size={20} color="var(--text-secondary)" />
                {unreadCount > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 18,
                      height: 18,
                      background: "var(--accent-danger)",
                      borderRadius: "50%",
                      border: "2px solid var(--bg-main)",
                      color: 'white',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>

              {isNotificationOpen && (
                <div className="animate-fade-in" style={{ 
                  position: "absolute", 
                    top: 'calc(100% + 12px)', 
                    right: 0, 
                    width: 350, 
                    maxHeight: 500, 
                    zIndex: 999, 
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-card)',
                    backdropFilter: 'var(--blur-lg)',
                    borderRadius: 16
                  }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span 
                          style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllRead();
                          }}
                        >
                          Mark all as read
                        </span>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                          <CustomIcon name="Bell" size={32} style={{ marginBottom: 12, opacity: 0.2 }} />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div 
                            key={n.id} 
                            style={{ 
                              padding: '16px 20px', 
                              borderBottom: '1px solid var(--border-glass)',
                              background: n.unread ? 'rgba(255,255,255,0.02)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.2s ease',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.unread ? 'rgba(255,255,255,0.02)' : 'transparent'}
                            onClick={() => {
                              handleMarkAsRead(n.id);
                              if (n.data?.ticketId) navigate(`/tickets/${n.data.ticketId}`);
                              setIsNotificationOpen(false);
                            }}
                          >
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ 
                                width: 36, 
                                height: 36, 
                                borderRadius: 10, 
                                background: n.type === 'assignment' 
                                  ? 'rgba(33, 150, 243, 0.1)' 
                                  : n.type === 'interview'
                                  ? 'rgba(156, 39, 176, 0.1)'
                                  : 'rgba(76, 175, 80, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {n.type === 'assignment' 
                                  ? <CustomIcon name="ShieldCheck" size={18} color="#2196f3" /> 
                                  : n.type === 'interview'
                                  ? <CustomIcon name="CalendarCheck" size={18} color="#9c27b0" />
                                  : <CustomIcon name="MessageSquare" size={18} color="#4caf50" />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{n.message}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </div>
                              </div>
                              {n.unread && (
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', marginTop: 6 }} />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button 
                      style={{ 
                        padding: 14, 
                        textAlign: 'center', 
                        color: 'var(--accent-primary)', 
                        fontWeight: 600, 
                        fontSize: '0.85rem',
                        background: 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid var(--border-glass)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        navigate('/notifications');
                        setIsNotificationOpen(false);
                      }}
                    >
                      See All Notifications
                    </button>
                  </div>
              )}
            </div>
            <button
              className="glass-card"
              style={{ padding: 8, borderRadius: 10, cursor: 'pointer' }}
              onClick={() => navigate('/settings')}
            >
              <CustomIcon name="Settings" size={20} color="var(--text-secondary)" />
            </button>
          </div>
        </header>

        <div className={styles.pageContainer}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
