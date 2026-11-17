import { forwardRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CustomDatePicker.css";

import styles from "../CustomInput/CustomInput.module.css";
import CustomIcon from "../CustomIcon";
import CalendarHeader from "./CalendarHeader";
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

/** Parse "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") is UTC and can shift a day). */
const parseLocalDate = (value?: string | number | null): Date | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toIsoDay = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

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
  selectsStart,
  selectsEnd,
  rangeStart,
  rangeEnd,
  ...props
}: CustomDatePickerProps<T> & { min?: string | number; minDate?: Date }) => {
  const renderPicker = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;
    const value = manualValue || fieldProps.field?.value || "";
    const onChange = manualOnChange || fieldProps.field?.onChange;

    const selectedDate = parseLocalDate(value);

    const handleChange = (date: Date | null) => {
      if (onChange) onChange(date ? toIsoDay(date) : "");
    };

    const resolvedMinDate: Date | undefined =
      minDate || parseLocalDate(min) || undefined;

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
        <DatePicker
          selected={selectedDate}
          onChange={handleChange as any}
          customInput={
            <DateCustomInput
              error={error}
              className={className}
              placeholder={placeholder || "Select a date"}
              {...props}
            />
          }
          // Shown as "Nov 20, 2026"; typing "2026-11-20" also works.
          dateFormat={["MMM d, yyyy", "yyyy-MM-dd"]}
          renderCustomHeader={(h) => <CalendarHeader {...h} />}
          isClearable={!props.disabled}
          portalId="root-portal"
          popperPlacement="bottom-start"
          disabled={props.disabled}
          minDate={resolvedMinDate}
          selectsStart={selectsStart}
          selectsEnd={selectsEnd}
          startDate={parseLocalDate(rangeStart)}
          endDate={parseLocalDate(rangeEnd)}
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
