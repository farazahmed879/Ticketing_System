import styles from "./CustomInput.module.css";
import { Controller, type FieldValues } from "react-hook-form";

import type { CustomInputProps } from "../types";

const CustomInput = <T extends FieldValues>({
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
}: CustomInputProps<T>) => {
  const renderInput = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;
    const hasValue = fieldProps?.field?.value || props.value;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            className={`${styles.input} ${className || ""} ${hasValue ? styles.hasValue : ""}`}
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
