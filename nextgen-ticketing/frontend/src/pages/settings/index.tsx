import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomColorPicker from "../../components/CustomColorPicker";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useAuth } from "../../context/AuthContext";
import { ROLE_TYPE } from "../roles/roleConstants";
import Profile from "../profile";
import styles from "./Settings.module.css";
import { t } from "i18next";

const PasswordSection = () => {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm();
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onSubmit = async (data: any) => {
    try {
      setMsg(null);
      await api.post("/users/profile/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setMsg({ type: "success", text: "Password updated successfully!" });
      reset();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update password",
      });
    }
  };

  const newPassword = watch("newPassword");

  return (
    <div className={styles.securityCard}>
      <h4>
        <CustomIcon name="Lock" size={18} /> Change Password
      </h4>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formGrid}>
          <CustomInput
            name="currentPassword"
            control={control}
            label="Current Password"
            type="password"
            placeholder="••••••••"
            icon={<CustomIcon name="Key" size={16} />}
            rules={{ required: "Current password is required" }}
          />
          <div></div>

          <CustomInput
            name="newPassword"
            control={control}
            label="New Password"
            type="password"
            placeholder="••••••••"
            icon={<CustomIcon name="ShieldCheck" size={16} />}
            rules={{
              required: t("settings.newPasswordRequired"),
              minLength: {
                value: 6,
                message: t("settings.passwordMinLength"),
              },
            }}
          />

          <CustomInput
            name="confirmPassword"
            control={control}
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            icon={<CustomIcon name="ShieldCheck" size={16} />}
            rules={{
              required: "Please confirm your password",
              validate: (value: string) =>
                value === newPassword || "Passwords do not match",
            }}
          />
        </div>

        {msg && (
          <div
            className={
              msg.type === "success" ? styles.successMsg : styles.error
            }
            style={{ marginTop: 16 }}
          >
            {msg.type === "success" && (
              <CustomIcon name="CheckCircle" size={16} />
            )}
            {msg.text}
          </div>
        )}

        <CustomButton
          type="submit"
          loading={isSubmitting}
          icon={<CustomIcon name="Lock" size={16} />}
          style={{ marginTop: 24 }}
        >
          Update Password
        </CustomButton>
      </form>
    </div>
  );
};

const PhoneSection = () => {
  const { user } = useAuth();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onSubmit = async (data: any) => {
    try {
      setMsg(null);
      await api.post("/users/profile/phone", {
        currentPhone: data.currentPhone,
        newPhone: data.newPhone,
      });
      setMsg({ type: "success", text: "Phone number updated successfully!" });
      reset();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update phone number",
      });
    }
  };

  return (
    <div className={styles.securityCard}>
      <h4>
        <CustomIcon name="Phone" size={18} /> Change Phone Number
      </h4>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formGrid}>
          <CustomInput
            name="currentPhone"
            control={control}
            label="Current Phone Number"
            type="text"
            placeholder={user?.mobileNumber || "Verify current number"}
            icon={<CustomIcon name="Smartphone" size={16} />}
            rules={{ required: "Current phone number is required" }}
          />

          <CustomInput
            name="newPhone"
            control={control}
            label="New Phone Number"
            type="text"
            placeholder="New phone number"
            icon={<CustomIcon name="PhoneCall" size={16} />}
            rules={{ required: "New phone number is required" }}
          />
        </div>

        {msg && (
          <div
            className={
              msg.type === "success" ? styles.successMsg : styles.error
            }
            style={{ marginTop: 16 }}
          >
            {msg.type === "success" && (
              <CustomIcon name="CheckCircle" size={16} />
            )}
            {msg.text}
          </div>
        )}

        <CustomButton
          type="submit"
          loading={isSubmitting}
          icon={<CustomIcon name="Phone" size={16} />}
          style={{ marginTop: 24 }}
        >
          Update Phone
        </CustomButton>
      </form>
    </div>
  );
};

const AUTO_CLOSE_OPTIONS = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "1 Month" },
  { value: 60, label: "2 Months" },
  { value: 90, label: "3 Months" },
];

const TicketSettingsSection = () => {
  const [autoCloseDays, setAutoCloseDays] = useState(7);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get(API_ROUTES.COMMON.SETTINGS)
      .then((res) => {
        const s = res.data.settings;
        setAutoCloseDays(s.autoCloseDays ?? 7);
        setAutoCloseEnabled(s.autoCloseEnabled ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(API_ROUTES.COMMON.SETTINGS, {
        autoCloseDays,
        autoCloseEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save ticket settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <CustomIcon name="Ticket" size={24} color="var(--accent-primary)" />
        <div>
          <h3>Ticket Settings</h3>
          <p>Configure automatic ticket behaviour</p>
        </div>
      </div>

      {/* Auto-close toggle */}
      <div className={styles.settingGroup}>
        <label>Auto-Close Resolved Tickets</label>
        <div className={styles.themeToggleGrid}>
          <CustomButton
            variant={autoCloseEnabled ? "secondary" : "ghost"}
            className={`${styles.themeOption} ${autoCloseEnabled ? styles.themeOptionActive : ""}`}
            onClick={() => setAutoCloseEnabled(true)}
            icon={<CustomIcon name="Check" size={18} />}
          >
            Enabled
          </CustomButton>
          <CustomButton
            variant={!autoCloseEnabled ? "secondary" : "ghost"}
            className={`${styles.themeOption} ${!autoCloseEnabled ? styles.themeOptionActive : ""}`}
            onClick={() => setAutoCloseEnabled(false)}
            icon={<CustomIcon name="X" size={18} />}
          >
            Disabled
          </CustomButton>
        </div>
      </div>

      {/* Time interval selector */}
      {autoCloseEnabled && (
        <div className={styles.settingGroup}>
          <label>Auto-Close After</label>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Tickets in "Resolved" or "Approved" status will be automatically
            closed after this period if the client does not close them.
          </p>
          <div className={styles.themeToggleGrid}>
            {AUTO_CLOSE_OPTIONS.map((opt) => (
              <CustomButton
                key={opt.value}
                variant={autoCloseDays === opt.value ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${autoCloseDays === opt.value ? styles.themeOptionActive : ""}`}
                onClick={() => setAutoCloseDays(opt.value)}
              >
                {opt.label}
              </CustomButton>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <div />
        <CustomButton
          variant="gradient"
          onClick={handleSave}
          loading={saving}
          icon={saved ? <CustomIcon name="Check" size={16} /> : undefined}
        >
          {saved ? "Saved!" : "Save Settings"}
        </CustomButton>
      </div>
    </div>
  );
};

const NOTIFICATION_RETENTION_OPTIONS = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "1 Month" },
  { value: 60, label: "2 Months" },
  { value: 90, label: "3 Months" },
];

const NotificationSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.roleType === ROLE_TYPE.ADMIN;

  // Personal preferences (saved in localStorage)
  const [emailAlerts, setEmailAlerts] = useState(() => {
    return localStorage.getItem("pref_email_alerts") !== "false";
  });
  const [soundAlerts, setSoundAlerts] = useState(() => {
    return localStorage.getItem("pref_sound_alerts") !== "false";
  });
  const [desktopAlerts, setDesktopAlerts] = useState(() => {
    return localStorage.getItem("pref_desktop_alerts") !== "false";
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "denied" && desktopAlerts) {
        setPermissionError(
          "Notifications are blocked by your browser settings.",
        );
      } else if (Notification.permission === "default" && desktopAlerts) {
        setPermissionError(
          "Action required: Click 'On' to enable browser permission.",
        );
      } else {
        setPermissionError(null);
      }
    } else {
      setPermissionError(
        "Desktop notifications are not supported by this browser.",
      );
    }
  }, [desktopAlerts]);

  const handleToggleDesktopAlerts = async (enable: boolean) => {
    if (enable) {
      if (!("Notification" in window)) {
        alert("Desktop notifications are not supported by this browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setDesktopAlerts(true);
        setPermissionError(null);
      } else {
        alert(
          "Notification permission was denied. Please allow notifications in your browser settings.",
        );
        setDesktopAlerts(false);
        setPermissionError(
          "Notifications are blocked by your browser settings.",
        );
      }
    } else {
      setDesktopAlerts(false);
      setPermissionError(null);
    }
  };

  const sendTestNotification = async () => {
    if (!("Notification" in window)) {
      alert("Desktop notifications are not supported by this browser.");
      return;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission === "granted") {
      try {
        const n = new Notification("Test Notification", {
          body: "If you see this, desktop notifications are working perfectly!",
          icon: "/favicon.ico",
        });
        n.onclick = () => {
          window.focus();
        };
      } catch (e) {
        alert(`Error sending notification: ${e}`);
      }
    } else {
      alert(
        `Notification permission is currently: ${permission}. Please allow notifications in your browser settings to test.`,
      );
    }
  };

  // Global settings (fetched from api, only for admins)
  const [retentionDays, setRetentionDays] = useState(30);
  const [retentionEnabled, setRetentionEnabled] = useState(true);
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    api
      .get(API_ROUTES.COMMON.SETTINGS)
      .then((res) => {
        const s = res.data.settings;
        setRetentionDays(s.notificationRetentionDays ?? 30);
        setRetentionEnabled(s.notificationRetentionEnabled ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save personal preferences to localStorage
      localStorage.setItem("pref_email_alerts", String(emailAlerts));
      localStorage.setItem("pref_sound_alerts", String(soundAlerts));
      localStorage.setItem("pref_desktop_alerts", String(desktopAlerts));

      // Save global preferences if Admin
      if (isAdmin) {
        await api.put(API_ROUTES.COMMON.SETTINGS, {
          notificationRetentionDays: retentionDays,
          notificationRetentionEnabled: retentionEnabled,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save notification settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <CustomIcon name="Bell" size={24} color="var(--accent-primary)" />
        <div>
          <h3>Notification Settings</h3>
          <p>Configure notification rules and cleanup policies</p>
        </div>
      </div>

      {/* Personal preferences */}
      <div
        style={{
          marginBottom: isAdmin ? "32px" : "0px",
          borderBottom: isAdmin ? "1px solid var(--border-glass)" : "none",
          paddingBottom: isAdmin ? "24px" : "0px",
        }}
      >
        <h4
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          <CustomIcon name="Settings" size={16} /> Personal Preferences
        </h4>

        <div
          className={styles.settingGroup}
          style={{
            borderBottom: "1px solid var(--border-glass)",
            paddingBottom: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  margin: "0 0 4px 0",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                Email Notifications
              </label>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Receive email alerts for important updates and ticket
                assignments
              </p>
            </div>
            <div
              className={styles.themeToggleGrid}
              style={{ maxWidth: "200px" }}
            >
              <CustomButton
                variant={emailAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${emailAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => setEmailAlerts(true)}
              >
                On
              </CustomButton>
              <CustomButton
                variant={!emailAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${!emailAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => setEmailAlerts(false)}
              >
                Off
              </CustomButton>
            </div>
          </div>
        </div>

        <div
          className={styles.settingGroup}
          style={{
            borderBottom: "1px solid var(--border-glass)",
            paddingBottom: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  margin: "0 0 4px 0",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                Sound Alerts
              </label>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Play notification sounds for real-time inbox messages
              </p>
            </div>
            <div
              className={styles.themeToggleGrid}
              style={{ maxWidth: "200px" }}
            >
              <CustomButton
                variant={soundAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${soundAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => setSoundAlerts(true)}
              >
                On
              </CustomButton>
              <CustomButton
                variant={!soundAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${!soundAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => setSoundAlerts(false)}
              >
                Off
              </CustomButton>
            </div>
          </div>
        </div>

        <div className={styles.settingGroup}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  margin: "0 0 4px 0",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                Desktop Notifications
              </label>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Show banner alerts on screen when background updates occur
              </p>
              {permissionError && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--accent-danger)",
                    margin: "4px 0 0 0",
                    fontWeight: 500,
                  }}
                >
                  {permissionError}
                </p>
              )}
              {"Notification" in window && (
                <CustomButton
                  variant="ghost"
                  onClick={sendTestNotification}
                  style={{
                    marginTop: "8px",
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    height: "auto",
                    display: "inline-flex",
                    minHeight: "unset",
                  }}
                >
                  Send Test Notification
                </CustomButton>
              )}
            </div>
            <div
              className={styles.themeToggleGrid}
              style={{ maxWidth: "200px" }}
            >
              <CustomButton
                variant={desktopAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${desktopAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => handleToggleDesktopAlerts(true)}
              >
                On
              </CustomButton>
              <CustomButton
                variant={!desktopAlerts ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${!desktopAlerts ? styles.themeOptionActive : ""}`}
                onClick={() => handleToggleDesktopAlerts(false)}
              >
                Off
              </CustomButton>
            </div>
          </div>
        </div>
      </div>

      {/* Global cleanup (Admins only) */}
      {isAdmin && (
        <div>
          <h4
            style={{
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            <CustomIcon name="Database" size={16} /> Global Notification
            Retention (Admin Only)
          </h4>

          <div className={styles.settingGroup}>
            <label>Auto-Delete Notifications</label>
            <div className={styles.themeToggleGrid}>
              <CustomButton
                variant={retentionEnabled ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${retentionEnabled ? styles.themeOptionActive : ""}`}
                onClick={() => setRetentionEnabled(true)}
                icon={<CustomIcon name="Check" size={18} />}
              >
                Enabled
              </CustomButton>
              <CustomButton
                variant={!retentionEnabled ? "secondary" : "ghost"}
                className={`${styles.themeOption} ${!retentionEnabled ? styles.themeOptionActive : ""}`}
                onClick={() => setRetentionEnabled(false)}
                icon={<CustomIcon name="X" size={18} />}
              >
                Disabled
              </CustomButton>
            </div>
          </div>

          {retentionEnabled && (
            <div className={styles.settingGroup}>
              <label>Delete Notifications After</label>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                All user notifications stored in the database will be
                permanently deleted after this retention period.
              </p>
              <div className={styles.themeToggleGrid}>
                {NOTIFICATION_RETENTION_OPTIONS.map((opt) => (
                  <CustomButton
                    key={opt.value}
                    variant={
                      retentionDays === opt.value ? "secondary" : "ghost"
                    }
                    className={`${styles.themeOption} ${retentionDays === opt.value ? styles.themeOptionActive : ""}`}
                    onClick={() => setRetentionDays(opt.value)}
                  >
                    {opt.label}
                  </CustomButton>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <div />
        <CustomButton
          variant="gradient"
          onClick={handleSave}
          loading={saving}
          icon={saved ? <CustomIcon name="Check" size={16} /> : undefined}
        >
          {saved ? "Saved!" : "Save Settings"}
        </CustomButton>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role?.roleType === ROLE_TYPE.ADMIN;
  const [activeTab, setActiveTab] = useState("theme");
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem("--accent-primary") || "#7c3aed",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    localStorage.getItem("--accent-secondary") || "#06b6d4",
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [defaultListView, setDefaultListView] = useState(
    localStorage.getItem("defaultListView") || "list",
  );
  const [currentLang, setCurrentLang] = useState(
    i18n.language?.split("-")[0] || "en",
  );
  const [isSaved, setIsSaved] = useState(false);

  const presets = [
    { primary: "#7c3aed", secondary: "#06b6d4", name: "Original Purple" },
    { primary: "#3b82f6", secondary: "#2dd4bf", name: "Deep Sea" },
    { primary: "#f43f5e", secondary: "#fb923c", name: "Sunset" },
    { primary: "#10b981", secondary: "#84cc16", name: "Forest" },
    { primary: "#f59e0b", secondary: "#ef4444", name: "Volcano" },
    { primary: "#6366f1", secondary: "#ec4899", name: "Cyberpunk" },
  ];

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent-primary",
      primaryColor,
    );
    document.documentElement.style.setProperty(
      "--accent-secondary",
      secondaryColor,
    );
    document.documentElement.style.setProperty(
      "--border-active",
      `${primaryColor}80`,
    );
    document.documentElement.setAttribute("data-theme", theme);

    localStorage.setItem("--accent-primary", primaryColor);
    localStorage.setItem("--accent-secondary", secondaryColor);
    localStorage.setItem("theme", theme);
    localStorage.setItem("defaultListView", defaultListView);
  }, [primaryColor, secondaryColor, theme, defaultListView]);

  const handleReset = () => {
    setPrimaryColor("#7c3aed");
    setSecondaryColor("#06b6d4");
    setTheme("light");
    setDefaultListView("list");
    i18n.changeLanguage("en");
    setCurrentLang("en");
  };

  const tabs = [
    {
      id: "profile",
      label: t("settings.profile"),
      icon: <CustomIcon name="User" size={18} />,
    },
    {
      id: "security",
      label: t("settings.security"),
      icon: <CustomIcon name="Shield" size={18} />,
    },
    {
      id: "notifications",
      label: t("settings.notifications"),
      icon: <CustomIcon name="Bell" size={18} />,
    },
    {
      id: "theme",
      label: t("settings.theme"),
      icon: <CustomIcon name="Palette" size={18} />,
    },
    ...(isAdmin
      ? [
          {
            id: "ticket-settings",
            label: "Ticket Settings",
            icon: <CustomIcon name="Ticket" size={18} />,
          },
        ]
      : []),
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
          {t("settings.title")}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>{t("settings.subtitle")}</p>
      </div>

      <div className={styles.container}>
        <aside className={`${styles.sidebar} glass-card`}>
          {tabs.map((tab) => (
            <CustomButton
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              fullWidth
              style={{ justifyContent: "flex-start" }}
            >
              {tab.label}
            </CustomButton>
          ))}
        </aside>

        <main
          className={`${activeTab === "profile" ? styles.profileContent : styles.content + " glass-card"}`}
        >
          {activeTab === "theme" && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <CustomIcon
                  name="Palette"
                  size={24}
                  color="var(--accent-primary)"
                />
                <div>
                  <h3>{t("settings.theme")}</h3>
                  <p>{t("settings.subtitle")}</p>
                </div>
              </div>

              <div
                className={styles.settingGroup}
                style={{
                  borderBottom: "1px solid var(--border-glass)",
                  paddingBottom: "24px",
                  marginBottom: "32px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <CustomIcon
                    name="Languages"
                    size={20}
                    color="var(--accent-primary)"
                  />
                  <label
                    style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}
                  >
                    {t("settings.language")}
                  </label>
                </div>
                <div className={styles.themeToggleGrid}>
                  <CustomButton
                    variant={currentLang === "en" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${currentLang === "en" ? styles.themeOptionActive : ""}`}
                    onClick={() => {
                      i18n.changeLanguage("en");
                      setCurrentLang("en");
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🇺🇸</span>
                      <span>{t("languages.en")}</span>
                    </div>
                  </CustomButton>
                  <CustomButton
                    variant={currentLang === "ar" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${currentLang === "ar" ? styles.themeOptionActive : ""}`}
                    onClick={() => {
                      i18n.changeLanguage("ar");
                      setCurrentLang("ar");
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🇸🇦</span>
                      <span>{t("languages.ar")}</span>
                    </div>
                  </CustomButton>
                  <CustomButton
                    variant={currentLang === "ur" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${currentLang === "ur" ? styles.themeOptionActive : ""}`}
                    onClick={() => {
                      i18n.changeLanguage("ur");
                      setCurrentLang("ur");
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🇵🇰</span>
                      <span>{t("languages.ur")}</span>
                    </div>
                  </CustomButton>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>{t("settings.appearance")}</label>
                <div className={styles.themeToggleGrid}>
                  <CustomButton
                    variant={theme === "light" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${theme === "light" ? styles.themeOptionActive : ""}`}
                    onClick={() => setTheme("light")}
                    icon={<CustomIcon name="Sun" size={20} />}
                  >
                    {t("settings.light")}
                  </CustomButton>
                  <CustomButton
                    variant={theme === "dark" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${theme === "dark" ? styles.themeOptionActive : ""}`}
                    onClick={() => setTheme("dark")}
                    icon={<CustomIcon name="Moon" size={20} />}
                  >
                    {t("settings.dark")}
                  </CustomButton>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>Default List View Page Layout</label>
                <div className={styles.themeToggleGrid}>
                  <CustomButton
                    variant={defaultListView === "list" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${defaultListView === "list" ? styles.themeOptionActive : ""}`}
                    onClick={() => setDefaultListView("list")}
                    icon={<CustomIcon name="List" size={20} />}
                  >
                    List View
                  </CustomButton>
                  <CustomButton
                    variant={defaultListView === "grid" ? "secondary" : "ghost"}
                    className={`${styles.themeOption} ${defaultListView === "grid" ? styles.themeOptionActive : ""}`}
                    onClick={() => setDefaultListView("grid")}
                    icon={<CustomIcon name="LayoutGrid" size={20} />}
                  >
                    Grid View
                  </CustomButton>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>{t("settings.primaryColor")}</label>
                <CustomColorPicker
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
              </div>

              <div className={styles.settingGroup}>
                <label>{t("settings.secondaryColor")}</label>
                <CustomColorPicker
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
              </div>

              <div className={styles.settingGroup}>
                <label>{t("settings.presets")}</label>
                <div className={styles.presetsGrid}>
                  {presets.map((preset, i) => (
                    <CustomButton
                      key={i}
                      variant="ghost"
                      className={styles.presetCard}
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                      }}
                      style={{
                        border:
                          primaryColor === preset.primary
                            ? "2px solid var(--accent-primary)"
                            : "1px solid var(--border-glass)",
                        flexDirection: "column",
                        height: "auto",
                        padding: "12px",
                      }}
                    >
                      <div className={styles.presetPreview}>
                        <div style={{ background: preset.primary }}></div>
                        <div style={{ background: preset.secondary }}></div>
                      </div>
                      <span>{preset.name}</span>
                    </CustomButton>
                  ))}
                </div>
              </div>

              <div className={styles.actions}>
                <CustomButton
                  variant="outline"
                  onClick={handleReset}
                  icon={<CustomIcon name="RefreshCcw" size={16} />}
                >
                  {t("settings.reset")}
                </CustomButton>
                <CustomButton
                  variant="gradient"
                  onClick={() => {
                    setIsSaved(true);
                    setTimeout(() => setIsSaved(false), 2000);
                  }}
                  icon={
                    isSaved ? <CustomIcon name="Check" size={16} /> : undefined
                  }
                >
                  {isSaved ? t("settings.saved") : t("settings.save")}
                </CustomButton>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className={styles.securityGrid}>
              <div className={styles.sectionHeader}>
                <CustomIcon
                  name="Shield"
                  size={24}
                  color="var(--accent-primary)"
                />
                <div>
                  <h3>{t("settings.securityTitle")}</h3>
                  <p>{t("settings.securitySubtitle")}</p>
                </div>
              </div>

              {/* Change Password Card */}
              <PasswordSection />

              {/* Change Phone Number Card */}
              <PhoneSection />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="animate-fade-in">
              <Profile />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="animate-fade-in">
              <NotificationSettingsSection />
            </div>
          )}

          {activeTab !== "theme" &&
            activeTab !== "security" &&
            activeTab !== "profile" &&
            activeTab !== "notifications" &&
            activeTab !== "ticket-settings" && (
              <div className={styles.emptyState}>
                <CustomIcon
                  name="Layout"
                  size={48}
                  style={{ opacity: 0.1, marginBottom: 16 }}
                />
                <p>
                  {tabs.find((t) => t.id === activeTab)?.label}{" "}
                  {t("settings.comingSoon")}
                </p>
              </div>
            )}

          {activeTab === "ticket-settings" && isAdmin && (
            <div className="animate-fade-in">
              <TicketSettingsSection />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;
