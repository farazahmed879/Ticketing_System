import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomColorPicker from "../../components/CustomColorPicker";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
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

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("theme");
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem("--accent-primary") || "#7c3aed",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    localStorage.getItem("--accent-secondary") || "#06b6d4",
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
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
  }, [primaryColor, secondaryColor, theme]);

  const handleReset = () => {
    setPrimaryColor("#7c3aed");
    setSecondaryColor("#06b6d4");
    setTheme("light");
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
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
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
                <label>{t("settings.primaryColor")}</label>
                <div className={styles.colorPickerWrapper}>
                  <CustomColorPicker
                    value={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <CustomInput
                    type="text"
                    value={primaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPrimaryColor(e.target.value)
                    }
                    className={styles.colorInput}
                    containerStyle={{ flex: 1, maxWidth: 120 }}
                  />
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>{t("settings.secondaryColor")}</label>
                <div className={styles.colorPickerWrapper}>
                  <CustomColorPicker
                    value={secondaryColor}
                    onChange={setSecondaryColor}
                  />
                  <CustomInput
                    type="text"
                    value={secondaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSecondaryColor(e.target.value)
                    }
                    className={styles.colorInput}
                    containerStyle={{ flex: 1, maxWidth: 120 }}
                  />
                </div>
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

          {activeTab !== "theme" &&
            activeTab !== "security" &&
            activeTab !== "profile" && (
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
        </main>
      </div>
    </div>
  );
};

export default Settings;
