import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomInput from "../../components/CustomInput";
import CustomTextArea from "../../components/CustomTextArea";
import CustomSelect from "../../components/CustomSelect";
import { UIMessages } from "../../utils/constants";
import styles from "./Login.module.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [helpType, setHelpType] = useState("FORGOT_PASSWORD");
  const [helpQuery, setHelpQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN, { email, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || UIMessages.LOGIN.FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setIsLoading(true);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN_HELP, {
        email: forgotEmail,
        type: helpType,
        query: helpQuery,
      });
      setForgotSuccess(res.data.message);
      setForgotEmail("");
      setHelpQuery("");
    } catch (err: any) {
      setError(err.response?.data?.message || UIMessages.COMMON.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={`${styles.loginCard} glass-card`}>
        <div className={styles.header}>
          <img
            src="/logo-full.png"
            alt="Jami Partners Logo"
            style={{ width: "100%", maxWidth: 220, marginBottom: 12 }}
          />
          <p>Ticketing System Management</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {forgotSuccess && <div className={styles.success}>{forgotSuccess}</div>}

        {!showForgot ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <CustomInput
              label="Email Address"
              type="email"
              placeholder="admin@nextgen.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <CustomInput
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    tabIndex={-1}
                    style={{
                      background: "transparent",
                      color: "var(--accent-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Help me login
                  </button>
                </div>
              }
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <CustomIcon name="EyeOff" size={18} color="var(--text-muted)" /> : <CustomIcon name="Eye" size={18} color="var(--text-muted)" />}
                </button>
              }
            />

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleForgotSubmit}>
              <CustomSelect
                label="How can we help?"
                value={helpType}
                onChange={(val) => setHelpType(val)}
                options={[
                  { value: "FORGOT_PASSWORD", label: "Forgot Password" },
                  { value: "UNABLE_TO_LOGIN", label: "Unable to Login" },
                  { value: "OTHER", label: "Other Query" },
                ]}
                style={{ marginBottom: '12px' }}
              />

              <CustomInput
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                containerStyle={{ marginBottom: "12px" }}
              />

              <CustomTextArea
                label="Message / Query"
                placeholder="Describe your issue..."
                value={helpQuery}
                onChange={(e) => setHelpQuery(e.target.value)}
                rows={3}
                style={{ resize: "none" }}
              />

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Sending request..." : "Submit Request"}
            </button>

            <button
              type="button"
              className={styles.submitBtn}
              style={{
                marginTop: 12,
                background: "rgba(255,255,255,0.05)",
                color: "white",
              }}
              onClick={() => {
                setShowForgot(false);
                setError("");
                setForgotSuccess("");
              }}
            >
              Back to Login
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          Contact your administrator if you need an account.
        </div>
      </div>
    </div>
  );
};

export default Login;
