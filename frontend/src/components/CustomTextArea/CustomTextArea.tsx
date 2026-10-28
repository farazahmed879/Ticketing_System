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
  const resize = (el?: HTMLTextAreaElement | null) => {
    const target = el || innerRef.current;
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  useEffect(() => {
    if (autoResize) resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResize, props.value]);

  const renderTextarea = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;

    return (
      <div className={styles.container} style={containerStyle}>
        {label &&
          (typeof label === "string" ? (
            <label className={styles.label}>{label}</label>
          ) : (
            <div className={styles.label}>{label}</div>
          ))}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          <textarea
            {...props}
            {...fieldProps.field}
            ref={(el) => {
              innerRef.current = el;
              if (fieldProps.field?.ref) {
                if (typeof fieldProps.field.ref === "function") {
                  fieldProps.field.ref(el);
                } else {
                  fieldProps.field.ref.current = el;
                }
              }
            }}
            className={`${styles.textarea} ${className || ""}`}
            onInput={(e) => {
              if (autoResize) resize(e.currentTarget);
              props.onInput?.(e);
            }}
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
