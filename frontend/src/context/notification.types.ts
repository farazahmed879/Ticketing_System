export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export interface BackgroundTask {
  id: string;
  title: string;
  message?: string;
  status: "running" | "success" | "error";
}

export interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
  isLoading: boolean;
  loadingMessage: string;
  setIsLoading: (loading: boolean, message: string) => void;
  backgroundTask: BackgroundTask | null;
  runBackgroundTask: (
    title: string,
    action: () => Promise<string | void>,
    onComplete?: () => void
  ) => void;
  dismissBackgroundTask: () => void;
}
