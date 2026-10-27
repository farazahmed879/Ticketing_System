import styles from "./CustomTextArea.module.css";
import { Controller, type FieldValues } from "react-hook-form";
import { useEffect, useRef } from "react";

import type { CustomTextAreaProps } from "../types";

const CustomTextArea = <T extends FieldValues>({
  label,
  error: manualError,
  containerStyle,
  className,
  name,
  control,
  rules,
  autoResize,
  ...props
}: CustomTextAreaProps<T>) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea to fit its content (CSS max-height caps it, then it
  // scrolls). Runs on input and whenever the controlled value changes (so it
  // also shrinks back after the field is cleared).
  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (autoResize) resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResize, props.value]);

  const renderTextarea = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          <textarea
            ref={autoResize ? innerRef : undefined}
            className={`${styles.textarea} ${className || ""}`}
            {...props}
            {...fieldProps.field}
            onInput={autoResize ? resize : props.onInput}
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
