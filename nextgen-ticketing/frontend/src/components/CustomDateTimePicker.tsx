import { Controller, type FieldValues } from "react-hook-form";
import styles from "./CustomInput.module.css";
import CustomIcon from "./CustomIcon";
import type { CustomDateTimePickerProps } from "./types";

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
  ...props
}: CustomDateTimePickerProps<T>) => {
  const renderPicker = (fieldProps: any = {}) => {
    const error = manualError || fieldProps.error;
    const value = manualValue || fieldProps.field?.value || "";
    const onChange = manualOnChange || fieldProps.field?.onChange;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          <span className={styles.icon}>
            <CustomIcon name="CalendarClock" size={18} />
          </span>
          <input
            type="datetime-local"
            className={`${styles.input} ${className || ""}`}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            {...props}
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
          renderPicker({ field, error: error?.message })
        }
      />
    );
  }

  return renderPicker();
};

export default CustomDateTimePicker;
