import { useRef, type ChangeEvent } from "react";
import styles from "./CustomInput.module.css";
import { Controller, type FieldValues } from "react-hook-form";
import CustomIcon from "../CustomIcon";

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
  transform,
  allowClear,
  ...props
}: CustomInputProps<T>) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const renderInput = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;
    const field = fieldProps.field;
    const hasValue = field?.value || props.value;

    // Base change handler (RHF field or a manually-passed onChange). When a
    // `transform` is provided, run the raw value through it before storing.
    const baseOnChange = field?.onChange || (props.onChange as any);
    const handleChange = transform
      ? (e: ChangeEvent<HTMLInputElement>) =>
          baseOnChange?.(transform(e.target.value))
      : baseOnChange;

    const showClear =
      allowClear && !props.disabled && !props.readOnly && Boolean(hasValue);

    // Empty the field through the same handler typing uses. RHF takes the
    // value directly; manual `onChange={(e) => set(e.target.value)}` handlers
    // get an event-shaped object.
    const handleClear = () => {
      if (field) {
        field.onChange("");
      } else {
        const target = { value: "", name: inputRef.current?.name ?? "" };
        (props.onChange as any)?.({ target, currentTarget: target });
      }
      inputRef.current?.focus();
    };

    const setRefs = (el: HTMLInputElement | null) => {
      inputRef.current = el;
      field?.ref?.(el);
    };

    return (
      <div className={styles.container} style={containerStyle}>
        {label && (
          <label className={styles.label}>
            {label}
            {Boolean(props.required || rules?.required) && typeof label === "string" && (
              <span style={{ color: "var(--accent-danger)", marginLeft: 4 }}>*</span>
            )}
          </label>
        )}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            className={`${styles.input} ${className || ""} ${hasValue ? styles.hasValue : ""}`}
            {...props}
            {...field}
            ref={setRefs}
            onChange={handleChange}
          />
          {showClear && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              // Keep focus in the input (no blur flicker before clearing).
              onMouseDown={(e) => e.preventDefault()}
              aria-label="Clear"
              title="Clear"
            >
              <CustomIcon name="X" size={14} />
            </button>
          )}
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
