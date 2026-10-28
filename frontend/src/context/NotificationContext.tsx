import React, { createContext, useContext, useState, useCallback } from "react";
import CustomIcon from "../components/CustomIcon";
import CustomButton from "../components/CustomButton";
import styles from "./Notification.module.css";
import FullScreenLoader from "../components/FullScreenLoader";

import type {
  NotificationType,
  Notification,
  BackgroundTask,
  NotificationContextType,
} from "./notification.types";

export type {
  NotificationType,
  Notification,
  BackgroundTask,
  NotificationContextType,
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoadingState] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [backgroundTask, setBackgroundTask] = useState<BackgroundTask | null>(null);

  const setIsLoading = useCallback((loading: boolean, message: string = "") => {
    setIsLoadingState(loading);
    setLoadingMessage(message);
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    [],
  );

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const dismissBackgroundTask = useCallback(() => {
    setBackgroundTask(null);
  }, []);

  const runBackgroundTask = useCallback(
    async (
      title: string,
      action: () => Promise<string | void>,
      onComplete?: () => void
    ) => {
      const taskId = Math.random().toString(36).substring(2, 9);
      setBackgroundTask({
        id: taskId,
        title,
        message: "Running in background. You can continue working.",
        status: "running",
      });

      try {
        const resultMsg = await action();
        setBackgroundTask({
          id: taskId,
          title: "Complete",
          message: resultMsg || "Task completed successfully.",
          status: "success",
        });
        onComplete?.();
        setTimeout(() => {
          setBackgroundTask((curr) => (curr?.id === taskId ? null : curr));
        }, 6000);
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.error ||
          err.message ||
          "Failed to complete task.";
        setBackgroundTask({
          id: taskId,
          title: "Action Failed",
          message: errorMsg,
          status: "error",
        });
        setTimeout(() => {
          setBackgroundTask((curr) => (curr?.id === taskId ? null : curr));
        }, 8000);
      }
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        isLoading,
        loadingMessage,
        setIsLoading,
        backgroundTask,
        runBackgroundTask,
        dismissBackgroundTask,
      }}
    >
      {children}

      {/* Notifications Portal Area (Top Right) */}
      <div className={styles.container}>
        {notifications.map((n) => (
          <div key={n.id} className={`${styles.toast} ${styles[n.type]}`}>
            <div className={styles.icon}>
              {n.type === "success" && (
                <CustomIcon name="CheckCircle" size={20} />
              )}
              {n.type === "error" && (
                <CustomIcon name="AlertCircle" size={20} />
              )}
              {n.type === "info" && <CustomIcon name="Info" size={20} />}
              {n.type === "warning" && (
                <CustomIcon name="AlertTriangle" size={20} />
              )}
            </div>
            <div className={styles.message}>{n.message}</div>
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="X" size={16} />}
              onClick={() => removeNotification(n.id)}
              className={styles.close}
            />
          </div>
        ))}
      </div>

      {/* Background Task Snackbar (Bottom Right) */}
      {backgroundTask && (
        <div className={styles.bottomRightContainer}>
          <div
            className={`${styles.bottomRightSnackbar} ${
              backgroundTask.status === "running"
                ? styles.runningSnackbar
                : backgroundTask.status === "success"
                ? styles.successSnackbar
                : styles.errorSnackbar
            }`}
          >
            <div className={styles.icon}>
              {backgroundTask.status === "running" && (
                <div className={styles.spinAnimation}>
                  <CustomIcon
                    name="Loader2"
                    size={22}
                    className={styles.runningIcon}
                  />
                </div>
              )}
              {backgroundTask.status === "success" && (
                <CustomIcon
                  name="CheckCircle2"
                  size={22}
                  className={styles.successIcon}
                />
              )}
              {backgroundTask.status === "error" && (
                <CustomIcon
                  name="AlertCircle"
                  size={22}
                  className={styles.errorIcon}
                />
              )}
            </div>
            <div className={styles.taskContent}>
              <div className={styles.taskTitle}>
                {backgroundTask.title}
              </div>
              {backgroundTask.message && (
                <div className={styles.taskMessage}>
                  {backgroundTask.message}
                </div>
              )}
            </div>
            <CustomButton
              variant="ghost"
              size="sm"
              icon={<CustomIcon name="X" size={16} />}
              onClick={dismissBackgroundTask}
              title="Dismiss"
              className={styles.close}
            />
          </div>
        </div>
      )}

      {/* Full Screen Loader */}
      {isLoading && (
        <FullScreenLoader subMessage={loadingMessage} />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotification must be used within NotificationProvider");
  return context;
};
