import styles from "./CustomTextArea.module.css";
import { Controller, type FieldValues } from "react-hook-form";

import type { CustomTextAreaProps } from "../types";

const CustomTextArea = <T extends FieldValues>({
  label,
  error: manualError,
  containerStyle,
  className,
  name,
  control,
  rules,
  ...props
}: CustomTextAreaProps<T>) => {
  const renderTextarea = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          <textarea
            className={`${styles.textarea} ${className || ""}`}
            {...props}
            {...fieldProps.field}
          />
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
          renderTextarea({ field, error: error?.message })
        }
      />
    );
  }

  return renderTextarea();
};

export default CustomTextArea;
