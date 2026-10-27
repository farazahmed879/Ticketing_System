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
  suggestions = [],
}: CustomChipInputProps<T>) => {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);

  const renderChips = (currentValue: string, onChange: (val: string) => void, error?: string) => {
    const chips = currentValue ? currentValue.split(",").map(s => s.trim()).filter(Boolean) : [];

    const addChip = (raw: string) => {
      const newValue = raw.trim();
      if (newValue && !chips.includes(newValue)) {
        onChange([...chips, newValue].join(","));
      }
      setInputValue("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip(inputValue);
      } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
        const updatedChips = chips.slice(0, -1);
        onChange(updatedChips.join(","));
      }
    };

    const removeChip = (index: number) => {
      const updatedChips = chips.filter((_, i) => i !== index);
      onChange(updatedChips.join(","));
    };

    // Predefined tags not yet picked and matching whatever the user is typing.
    const availableSuggestions = suggestions.filter(
      (s) =>
        !chips.includes(s) &&
        s.toLowerCase().includes(inputValue.trim().toLowerCase()),
    );

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
            onFocus={() => setFocused(true)}
            onBlur={() => {
              if (inputValue.trim()) addChip(inputValue);
              setFocused(false);
            }}
            placeholder={chips.length === 0 ? placeholder : ""}
          />
        </div>

        {focused && availableSuggestions.length > 0 && (
          // Keep the input focused when a suggestion is clicked (mousedown fires
          // before blur) so the dropdown stays open for adding several tags.
          <div
            className={styles.suggestions}
            onMouseDown={(e) => e.preventDefault()}
          >
            {availableSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.suggestion}
                onClick={() => addChip(s)}
              >
                <CustomIcon name="Plus" size={12} />
                {s}
              </button>
            ))}
          </div>
        )}

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
