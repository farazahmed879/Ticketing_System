import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { socket } from "../services/socket";
import CustomIcon from "../components/CustomIcon";
import styles from "./MainLayout.module.css";
import Sidebar from "../components/Sidebar";

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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

  return (
    <div className={`${styles.layout} ${isCollapsed ? styles.layoutCollapsed : ""}`}>
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
      />

      <main className={styles.mainContent}>
        <header className={`${styles.topbar} ${scrolled ? styles.topbarScrolled : ""}`}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{t("topbar.overview")}</div>
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
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t("topbar.notifications")}</span>
                      {unreadCount > 0 && (
                        <span 
                          style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllRead();
                          }}
                        >
                          {t("topbar.markAllRead")}
                        </span>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                          <CustomIcon name="Bell" size={32} style={{ marginBottom: 12, opacity: 0.2 }} />
                          <p>{t("topbar.noNotifications")}</p>
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
                      {t("topbar.seeAll")}
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
