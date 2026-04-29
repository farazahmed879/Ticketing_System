import { Controller } from "react-hook-form";
import styles from "./CustomColorPicker.module.css";
import type { CustomColorPickerProps } from "./types";

const CustomColorPicker = <T extends any>({
  label,
  error: manualError,
  containerStyle,
  className,
  name,
  control,
  rules,
  value,
  onChange,
  ...props
}: CustomColorPickerProps<T>) => {
  const renderPicker = (fieldProps: any = {}) => {
    const currentValue = fieldProps.field?.value || value || "#000000";
    const currentOnChange = fieldProps.field?.onChange || onChange;
    const error = manualError || fieldProps.error;

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.pickerWrapper}>
          <div
            className={styles.swatch}
            style={{ backgroundColor: currentValue }}
          >
            <input
              type="color"
              className={styles.input}
              value={currentValue}
              onChange={(e) => currentOnChange?.(e.target.value)}
              {...props}
            />
          </div>
          <span className={styles.colorValue}>
            {currentValue.toUpperCase()}
          </span>
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

export default CustomColorPicker;
