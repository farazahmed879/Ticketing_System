import React from "react";
import styles from "./CustomInput.module.css";
import { Controller } from "react-hook-form";

import type { CustomInputProps } from "./types";

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error: manualError,
  icon,
  suffix,
  containerStyle,
  className,
  name,
  control,
  rules,
  ...props
}) => {
  const renderInput = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            className={`${styles.input} ${className || ""}`}
            {...props}
            {...fieldProps.field}
          />
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  };

  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) =>
          renderInput({ field, error: error?.message })
        }
      />
    );
  }

  return renderInput();
};

export default CustomInput;
