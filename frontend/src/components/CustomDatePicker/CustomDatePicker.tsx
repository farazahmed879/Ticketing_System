import { forwardRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CustomDatePicker.css";

import styles from "../CustomInput/CustomInput.module.css";
import CustomIcon from "../CustomIcon";
import type { CustomDatePickerProps } from "../types";

const DateCustomInput = forwardRef<HTMLInputElement, any>(
  ({ className, error, ...props }, ref) => (
    <div
      className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
      onClick={props.onClick}
    >
      <span className={styles.icon}>
        <CustomIcon name="Calendar" size={18} />
      </span>
      <input
        ref={ref}
        className={`${styles.input} ${className || ""}`}
        {...props}
      />
    </div>
  )
);

DateCustomInput.displayName = "DateCustomInput";

const CustomDatePicker = <T extends FieldValues>({
  label,
  error: manualError,
  containerStyle,
  className,
  name,
  control,
  rules,
  value: manualValue,
  onChange: manualOnChange,
  placeholder,
  min,
  minDate,
  ...props
}: CustomDatePickerProps<T> & { min?: string | number; minDate?: Date }) => {
  const renderPicker = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;
    const value = manualValue || fieldProps.field?.value || "";
    const onChange = manualOnChange || fieldProps.field?.onChange;

    const selectedDate = value ? new Date(value) : null;

    const handleChange = (date: Date | null) => {
      if (onChange) {
        if (!date) onChange("");
        else {
          const offset = date.getTimezoneOffset();
          const localDate = new Date(date.getTime() - offset * 60 * 1000);
          onChange(localDate.toISOString().split("T")[0]);
        }
      }
    };

    let resolvedMinDate: Date | undefined = minDate;
    if (!resolvedMinDate && min && typeof min === "string") {
      const parts = min.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const day = parseInt(parts[2], 10);
        resolvedMinDate = new Date(year, month, day);
      } else {
        resolvedMinDate = new Date(min);
      }
    }

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <DatePicker
          selected={selectedDate}
          onChange={handleChange as any}
          customInput={<DateCustomInput error={error} className={className} placeholder={placeholder} {...props} />}
          dateFormat="yyyy-MM-dd"
          isClearable
          portalId="root-portal"
          disabled={props.disabled}
          minDate={resolvedMinDate}
        />
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
          renderPicker({ field, error: error?.message })
        }
      />
    );
  }

  return renderPicker();
};

export default CustomDatePicker;
