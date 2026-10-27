import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import CustomIcon from "../../components/CustomIcon";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomInput from "../../components/CustomInput";
import CustomTextArea from "../../components/CustomTextArea";
import CustomSelect from "../../components/CustomSelect";
import CustomButton from "../../components/CustomButton";
import { UIMessages } from "../../utils/constants";
import styles from "./Login.module.css";

type AuthMode = "login" | "help";

const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");

  // Forms
  const { control: loginControl, handleSubmit: handleLoginSubmit } = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const {
    control: helpControl,
    handleSubmit: handleHelpSubmit,
    reset: resetHelp,
  } = useForm({
    defaultValues: {
      email: "",
      type: "FORGOT_PASSWORD",
      query: "",
    },
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { isLoading, setIsLoading } = useNotification();
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const switchMode = (newMode: AuthMode) => {
    setError("");
    setSuccessMsg("");
    setMode(newMode);
  };

  // Sign In submit
  const onLoginSubmit = async (data: any) => {
    setError("");
    setSuccessMsg("");
    setIsLoading(true, UIMessages.LOADING.LOGGING_IN);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN, {
        email: data.identifier,
        password: data.password,
      });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || UIMessages.LOGIN.FAILED);
    } finally {
      setIsLoading(false, "");
    }
  };

  // Help request submit
  const onHelpSubmit = async (data: any) => {
    setError("");
    setSuccessMsg("");
    setIsLoading(true, UIMessages.LOADING.PROCESSING);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN_HELP, data);
      setSuccessMsg(
        res.data.message || "Your request has been submitted successfully.",
      );
      resetHelp();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to process help request");
    } finally {
      setIsLoading(false, "");
    }
  };

  return (
    <div className={styles.container}>
      {/* Background ambient lighting orbs */}
      <div className={styles.ambientOrb1}></div>
      <div className={styles.ambientOrb2}></div>
      <div className={styles.ambientOrb3}></div>

      {/* Top Header Branding across unified single section */}
      <header className={styles.header}>
        <div className={styles.brandLogoGroup}>
          <div className={styles.brandLogoIcon}>
            <img src="/InsigniaStandalone.svg" alt="Jami Partners Insignia" />
          </div>
          <span className={styles.brandTitle}>Jami Partners</span>
        </div>
        {/* <div className={styles.headerRight}>
          <span className={styles.portalBadge}>Enterprise Portal</span>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot}></span>
            <span>All Systems Operational</span>
          </div>
        </div> */}
      </header>

      {/* Single Section Content: Left Presentation + Right Login Card Overlay */}
      <main className={styles.mainContent}>
        {/* Left Presentation Content */}
        <div className={styles.presentationContent}>
          <h1 className={styles.heroHeading}>
            Empowering Teams.
            <br />
            <span className={styles.heroHeadingAccent}>
              Accelerating Success.
            </span>
          </h1>
          <p className={styles.heroSubtext}>
            The centralized enterprise workspace built for mission-critical
            ticketing, precision timesheets, resource planning, and team
            collaboration.
          </p>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <CustomIcon name="Layers" size={22} />
              </div>
              <div>
                <div className={styles.featureTitle}>
                  Workflows & Smart Ticketing
                </div>
                <div className={styles.featureDesc}>
                  Real-time ticket tracking, Kanban view, SLA monitoring, and
                  cross-departmental coordination.
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <CustomIcon name="Clock" size={22} />
              </div>
              <div>
                <div className={styles.featureTitle}>
                  Precision Timesheets & Approvals
                </div>
                <div className={styles.featureDesc}>
                  Seamless daily task logs, weekly allocation overviews, and
                  automated HR & manager approval chains.
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <CustomIcon name="ShieldCheck" size={22} />
              </div>
              <div>
                <div className={styles.featureTitle}>
                  Talent & Institutional Security
                </div>
                <div className={styles.featureDesc}>
                  End-to-end recruitment pipelines, interview scheduling, scoped
                  permissions, and secure audit trails.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Floating Login Card Overlay */}
        <div className={styles.authWrapper}>
          <div className={styles.authCard}>
            {/* Error & Success Messages */}
            {error && (
              <div className={`${styles.error} animate-shake`}>
                <CustomIcon name="AlertCircle" size={18} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className={styles.success}>
                <CustomIcon name="CheckCircle" size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* =======================
              1. SIGN IN FORM
              ======================= */}
            {mode === "login" && (
              <>
                <div className={styles.authHeader}>
                  <h2 className={styles.authTitle}>Welcome Back</h2>
                  <p className={styles.authSubtitle}>
                    Enter your company credentials to access your workspace.
                  </p>
                </div>

                <form
                  className={styles.form}
                  onSubmit={handleLoginSubmit(onLoginSubmit)}
                >
                  <CustomInput
                    name="identifier"
                    control={loginControl}
                    label="Company Email or Username"
                    type="text"
                    placeholder="name@jamipartners.com or username"
                    icon={<CustomIcon name="User" size={18} />}
                    rules={{
                      required: "Company email or username is required",
                    }}
                  />

                  <CustomInput
                    name="password"
                    control={loginControl}
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    icon={<CustomIcon name="Lock" size={18} />}
                    rules={{ required: "Password is required" }}
                    suffix={
                      <CustomButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        icon={
                          <CustomIcon
                            name={showPassword ? "EyeOff" : "Eye"}
                            size={18}
                          />
                        }
                        style={{
                          padding: 0,
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          borderRadius: 6,
                          color: "var(--text-muted)",
                        }}
                        title={showPassword ? "Hide password" : "Show password"}
                      />
                    }
                  />

                  <div className={styles.forgotRow}>
                    <CustomButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => switchMode("help")}
                      style={{
                        padding: "2px 6px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--accent-primary)",
                      }}
                    >
                      Help me log in
                    </CustomButton>
                  </div>

                  <div className={styles.submitBtnWrapper}>
                    <CustomButton
                      type="submit"
                      className={styles.submitBtn}
                      loading={isLoading}
                      fullWidth
                      size="lg"
                    >
                      Sign In
                    </CustomButton>
                  </div>
                </form>
              </>
            )}

            {/* =======================
              2. HELP / RECOVERY FORM
              ======================= */}
            {mode === "help" && (
              <>
                <div className={styles.authHeader}>
                  <h2 className={styles.authTitle}>Help Center</h2>
                  <p className={styles.authSubtitle}>
                    Submit a query to the IT administration to recover access.
                  </p>
                </div>

                <form
                  className={styles.form}
                  onSubmit={handleHelpSubmit(onHelpSubmit)}
                >
                  <CustomSelect
                    name="type"
                    control={helpControl}
                    label="How can we help?"
                    dropdownClassName={styles.selectDropdown}
                    options={[
                      {
                        value: "FORGOT_PASSWORD",
                        label: "I forgot my password",
                      },
                      {
                        value: "ACCOUNT_LOCKED",
                        label: "My account is locked",
                      },
                      {
                        value: "TECHNICAL_ISSUE",
                        label: "I'm having technical issues",
                      },
                      { value: "OTHER", label: "Something else" },
                    ]}
                    rules={{ required: "Please select an option" }}
                  />

                  <CustomInput
                    name="email"
                    control={helpControl}
                    label="Your Registered Email"
                    type="email"
                    placeholder="name@company.com"
                    icon={<CustomIcon name="Mail" size={18} />}
                    rules={{
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    }}
                  />

                  <CustomTextArea
                    name="query"
                    control={helpControl}
                    label="Message / Description"
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    rules={{ required: "Message is required" }}
                  />

                  <div
                    className={styles.submitBtnWrapper}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <CustomButton
                      type="submit"
                      className={styles.submitBtn}
                      loading={isLoading}
                      fullWidth
                      size="lg"
                    >
                      Submit Request
                    </CustomButton>
                    <CustomButton
                      type="button"
                      variant="ghost"
                      fullWidth
                      onClick={() => switchMode("login")}
                    >
                      Back to Sign In
                    </CustomButton>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.copyrightText}>
          © {new Date().getFullYear()} Jami Partners. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Login;
