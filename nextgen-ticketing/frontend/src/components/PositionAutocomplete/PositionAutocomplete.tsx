import React, { useState, useEffect, useRef } from "react";
import { Controller, type FieldValues, type Control } from "react-hook-form";
import styles from "./PositionAutocomplete.module.css";
import CustomIcon from "../CustomIcon";
import { COMMON_POSITIONS } from "../../utils/constants";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";

export interface PositionAutocompleteProps<T extends FieldValues = any> {
  label?: string;
  name?: any;
  control?: Control<T>;
  rules?: any;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  containerStyle?: React.CSSProperties;
}

const PositionAutocomplete = <T extends FieldValues>({
  label = "Position / Role",
  name,
  control,
  rules,
  value: manualValue,
  onChange: manualOnChange,
  placeholder = "e.g. Senior Backend Developer",
  required = false,
  error: manualError,
  containerStyle,
}: PositionAutocompleteProps<T>) => {
  const [dbPositions, setDbPositions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch DB positions on mount for live suggestions
  useEffect(() => {
    let isMounted = true;
    api
      .get(API_ROUTES.CANDIDATES.POSITIONS)
      .then((res) => {
        if (isMounted && res.data.positions) {
          setDbPositions(res.data.positions);
        }
      })
      .catch((err) => {
        console.warn("Failed to load position suggestions:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const renderComponent = (
    currentValue: string = "",
    handleChange: (val: string) => void,
    fieldError?: string,
  ) => {
    const errorText = manualError || fieldError;
    const filterQuery = currentValue.trim().toLowerCase();

    // Deduplicate DB positions + static COMMON_POSITIONS
    const seen = new Set<string>();
    const allOptions: { title: string; source: "db" | "preset" }[] = [];

    for (const title of dbPositions) {
      const key = title.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        allOptions.push({ title, source: "db" });
      }
    }
    for (const title of COMMON_POSITIONS) {
      const key = title.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        allOptions.push({ title, source: "preset" });
      }
    }

    const filteredOptions = allOptions.filter((opt) =>
      opt.title.toLowerCase().includes(filterQuery),
    );

    const handleSelect = (selectedTitle: string) => {
      handleChange(selectedTitle);
      setIsOpen(false);
    };

    return (
      <div
        className={styles.container}
        style={containerStyle}
        ref={containerRef}
      >
        {label && (
          <label className={styles.label}>
            {label}
            {required && <span className={styles.requiredStar}>*</span>}
          </label>
        )}

        <div
          className={`${styles.inputWrapper} ${
            errorText ? styles.inputWrapperError : ""
          } glass-card`}
        >
          <span className={styles.icon}>
            <CustomIcon name="Briefcase" size={16} />
          </span>
          <input
            className={styles.input}
            value={currentValue}
            onChange={(e) => {
              handleChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay closing slightly so click on suggestion registers
              setTimeout(() => setIsOpen(false), 200);
            }}
            placeholder={placeholder}
          />
          <span className={styles.icon}>
            <CustomIcon name="ChevronDown" size={14} />
          </span>
        </div>

        {isOpen && filteredOptions.length > 0 && (
          <div
            className={styles.suggestions}
            onMouseDown={(e) => e.preventDefault()}
          >
            {filteredOptions.slice(0, 15).map((opt) => (
              <button
                key={opt.title}
                type="button"
                className={styles.suggestionItem}
                onClick={() => handleSelect(opt.title)}
              >
                <span>{opt.title}</span>
                <span className={styles.badge}>
                  {opt.source === "db" ? "Existing" : "Suggested"}
                </span>
              </button>
            ))}
          </div>
        )}

        {errorText && <span className={styles.errorText}>{errorText}</span>}
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
          renderComponent(field.value || "", field.onChange, error?.message)
        }
      />
    );
  }

  return renderComponent(manualValue || "", manualOnChange || (() => {}));
};

export default PositionAutocomplete;
