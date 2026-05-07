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
import CustomImage from "../../components/CustomImage";
import { UIMessages } from "../../utils/constants";
import styles from "./Login.module.css";

const Login: React.FC = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const { 
    control: helpControl, 
    handleSubmit: handleHelpSubmit, 
    reset: resetHelp 
  } = useForm({
    defaultValues: {
      email: "",
      type: "FORGOT_PASSWORD",
      query: ""
    }
  });

  const [error, setError] = useState("");
  const { isLoading, setIsLoading } = useNotification();
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const onLoginSubmit = async (data: any) => {
    setError("");
    setIsLoading(true, UIMessages.LOADING.LOGGING_IN);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN, data);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || UIMessages.LOGIN.FAILED);
    } finally {
      setIsLoading(false, "");
    }
  };

  const onHelpSubmit = async (data: any) => {
    setError("");
    setForgotSuccess("");
    setIsLoading(true, UIMessages.LOADING.PROCESSING);

    try {
      const res = await api.post(API_ROUTES.AUTH.LOGIN_HELP, data);
      setForgotSuccess(res.data.message);
      resetHelp();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to process request");
    } finally {
      setIsLoading(false, "");
    }
  };

  return (
    <div className={styles.container}>
      {/* Background Blobs */}
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>
      <div className={`${styles.blob} ${styles.blob3}`}></div>

      <div className={`${styles.loginCard} glass-card`}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <CustomImage 
              src="/logo-sq.png" 
              alt="Logo" 
              width={60} 
              height={60}
              className={styles.logo}
            />
          </div>
          <h1 className="text-gradient">Jami Partners</h1>
          <p>{showForgot ? "Help Center" : "Welcome back! Please sign in"}</p>
        </div>

        {error && (
          <div className={`${styles.error} animate-shake`}>
            <CustomIcon name="AlertCircle" size={18} />
            {error}
          </div>
        )}

        {forgotSuccess && (
          <div className={styles.success}>
            <CustomIcon name="CheckCircle" size={18} />
            {forgotSuccess}
          </div>
        )}

        {!showForgot ? (
          <form className={styles.form} onSubmit={handleSubmit(onLoginSubmit)}>
            <CustomInput
              name="email"
              control={control}
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              icon={<CustomIcon name="Mail" size={18} />}
              rules={{ 
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              }}
            />

            <div style={{ position: "relative" }}>
              <CustomInput
                name="password"
                control={control}
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon={<CustomIcon name="Lock" size={18} />}
                rules={{ required: "Password is required" }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                <CustomIcon name={showPassword ? "EyeOff" : "Eye"} size={18} />
              </button>
            </div>

            <div className={styles.forgotRow}>
              <button
                type="button"
                className={styles.forgotLink}
                onClick={() => setShowForgot(true)}
              >
                Forgot Password?
              </button>
            </div>

            <CustomButton
              type="submit"
              variant="gradient"
              loading={isLoading}
              fullWidth
              size="lg"
            >
              Sign In
            </CustomButton>

            <div className={styles.footer}>
              <span>Don't have an account?</span>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className={styles.registerLink}
              >
                Create Account
              </button>
            </div>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleHelpSubmit(onHelpSubmit)}>
            <CustomSelect
              name="type"
              control={helpControl}
              label="How can we help?"
              options={[
                { value: "FORGOT_PASSWORD", label: "I forgot my password" },
                { value: "ACCOUNT_LOCKED", label: "My account is locked" },
                { value: "TECHNICAL_ISSUE", label: "I'm having technical issues" },
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
                  message: "Invalid email address"
                }
              }}
            />

            <CustomTextArea
              name="query"
              control={helpControl}
              label="Message / Description"
              placeholder="Describe your issue..."
              rows={4}
              rules={{ required: "Message is required" }}
            />

            <div className={styles.buttonGroup}>
              <CustomButton
                type="submit"
                variant="gradient"
                loading={isLoading}
                fullWidth
              >
                Submit Request
              </CustomButton>
              <CustomButton
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => setShowForgot(false)}
              >
                Back to Login
              </CustomButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
