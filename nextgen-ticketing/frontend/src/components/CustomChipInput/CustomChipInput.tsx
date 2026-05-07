import { useState, type KeyboardEvent } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import styles from "./CustomChipInput.module.css";
import CustomIcon from "../CustomIcon";
import type { CustomChipInputProps } from "../types";

const CustomChipInput = <T extends FieldValues>({
  label,
  placeholder = "Add items...",
  error: manualError,
  icon,
  containerStyle,
  name,
  control,
  rules,
  value: manualValue,
  onChange: manualOnChange,
}: CustomChipInputProps<T>) => {
  const [inputValue, setInputValue] = useState("");

  const renderChips = (currentValue: string, onChange: (val: string) => void, error?: string) => {
    const chips = currentValue ? currentValue.split(",").map(s => s.trim()).filter(Boolean) : [];

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const newValue = inputValue.trim();
        if (newValue && !chips.includes(newValue)) {
          const updatedChips = [...chips, newValue];
          onChange(updatedChips.join(","));
          setInputValue("");
        }
      } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
        const updatedChips = chips.slice(0, -1);
        onChange(updatedChips.join(","));
      }
    };

    const removeChip = (index: number) => {
      const updatedChips = chips.filter((_, i) => i !== index);
      onChange(updatedChips.join(","));
    };

    return (
      <div className={styles.container} style={containerStyle}>
        {label && <label className={styles.label}>{label}</label>}
        <div
          className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          
          {chips.map((chip, index) => (
            <div key={`${chip}-${index}`} className={styles.chip}>
              <span>{chip}</span>
              <span 
                className={styles.removeChip} 
                onClick={() => removeChip(index)}
              >
                <CustomIcon name="X" size={12} />
              </span>
            </div>
          ))}

          <input
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                const newValue = inputValue.trim();
                if (!chips.includes(newValue)) {
                   onChange([...chips, newValue].join(","));
                }
                setInputValue("");
              }
            }}
            placeholder={chips.length === 0 ? placeholder : ""}
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
        render={({ field: { value, onChange }, fieldState: { error } }) =>
          renderChips(value || "", onChange, error?.message)
        }
      />
    );
  }

  return renderChips(manualValue || "", manualOnChange || (() => {}), manualError);
};

export default CustomChipInput;
