import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomInput from "../../components/CustomInput";
import styles from "./Register.module.css";
import CustomButton from "../../components/CustomButton";

const Register: React.FC = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      fullname: "",
      email: "",
      username: "",
      password: ""
    }
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const onRegisterSubmit = async (data: any) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post(API_ROUTES.AUTH.REGISTER, data);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to register. Please try again.",
      );
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
          <h1 className="text-gradient">Jami Partners</h1>
          <p>Create your account</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onRegisterSubmit)}>
          <CustomInput
            name="fullname"
            control={control}
            label="Full Name"
            type="text"
            placeholder="John Doe"
            rules={{ required: "Full name is required" }}
          />

          <CustomInput
            name="email"
            control={control}
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            rules={{ 
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            }}
          />

          <CustomInput
            name="username"
            control={control}
            label="Username"
            type="text"
            placeholder="johndoe"
            rules={{ required: "Username is required" }}
          />

          <CustomInput
            name="password"
            control={control}
            label="Password"
            type="password"
            placeholder="••••••••"
            rules={{ 
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters"
              }
            }}
          />

          <CustomButton
            type="submit"
            variant="gradient"
            loading={isLoading}
            fullWidth
          >
            Sign Up
          </CustomButton>
        </form>

        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{ color: "var(--accent-primary)", fontWeight: 600 }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
