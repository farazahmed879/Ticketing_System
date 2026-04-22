import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import styles from './Notification.module.css';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, isLoading, setIsLoading }}>
      {children}
      
      {/* Notifications Portal Area */}
      <div className={styles.container}>
        {notifications.map((n) => (
          <div key={n.id} className={`${styles.toast} ${styles[n.type]}`}>
            <div className={styles.icon}>
              {n.type === 'success' && <CheckCircle size={20} />}
              {n.type === 'error' && <AlertCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              {n.type === 'warning' && <AlertTriangle size={20} />}
            </div>
            <div className={styles.message}>{n.message}</div>
            <button className={styles.close} onClick={() => removeNotification(n.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Full Screen Loader */}
      {isLoading && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loaderContent}>
            <div className={styles.spinner}></div>
            <div className={styles.loaderText}>Processing...</div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
