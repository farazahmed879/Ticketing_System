import { forwardRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../CustomDatePicker/CustomDatePicker.css";

import styles from "../CustomInput/CustomInput.module.css";
import CustomIcon from "../CustomIcon";
import type { CustomDateTimePickerProps } from "../types";

const DateTimeCustomInput = forwardRef<HTMLInputElement, any>(
  ({ className, error, ...props }, ref) => (
    <div
      className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
      onClick={props.onClick}
    >
      <span className={styles.icon}>
        <CustomIcon name="CalendarClock" size={18} />
      </span>
      <input
        ref={ref}
        className={`${styles.input} ${className || ""}`}
        {...props}
      />
    </div>
  ),
);

DateTimeCustomInput.displayName = "DateTimeCustomInput";

const CustomDateTimePicker = <T extends FieldValues>({
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
  ...props
}: CustomDateTimePickerProps<T>) => {
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
          onChange(localDate.toISOString().slice(0, 16));
        }
      }
    };

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <DatePicker
          selected={selectedDate}
          onChange={handleChange as any}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="yyyy-MM-dd HH:mm"
          timeCaption="Time"
          isClearable
          portalId="root-portal"
          customInput={
            <DateTimeCustomInput
              error={error}
              className={className}
              placeholder={placeholder}
              {...props}
            />
          }
          disabled={props.disabled}
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

export default CustomDateTimePicker;
