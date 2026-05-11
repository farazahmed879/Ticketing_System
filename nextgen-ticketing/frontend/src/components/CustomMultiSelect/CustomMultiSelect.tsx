import React, { useState, useRef, useEffect } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import CustomIcon from "../CustomIcon";
import styles from "./CustomMultiSelect.module.css";
import type { CustomMultiSelectProps } from "../types";

const CustomMultiSelect = <T extends FieldValues = any>({
  options,
  value: manualValue,
  onChange: manualOnChange,
  placeholder = "Select options...",
  label,
  className,
  disabled = false,
  required = false,
  style,
  name,
  control,
  rules,
  error: manualError,
}: CustomMultiSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderMultiSelect = (fieldProps: any = {}) => {
    const value =
      manualValue !== undefined ? manualValue : fieldProps.field?.value || [];
    const onChange = manualOnChange || fieldProps.field?.onChange;
    const error = manualError || fieldProps.error;

    const toggleOption = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange?.(value.filter((v: string) => v !== optionValue));
      } else {
        onChange?.([...value, optionValue]);
      }
    };

    const removeOption = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(value.filter((v: string) => v !== optionValue));
    };

    const filteredOptions = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.sublabel &&
          opt.sublabel.toLowerCase().includes(search.toLowerCase())),
    );

    const selectedOptions = options.filter((opt) => value.includes(opt.value));

    return (
      <div
        className={`${styles.container} ${isOpen ? styles.containerActive : ""} ${className || ""}`}
        ref={containerRef}
        style={style}
      >
        {label && (
          <label className={styles.label}>
            {label}
            {required && (
              <span style={{ color: "var(--accent-danger)", marginLeft: 4 }}>
                *
              </span>
            )}
          </label>
        )}

        {/* Hidden input for validation */}
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
          value={value.join(",")}
          required={required}
          readOnly
        />

        <div
          className={`${styles.trigger} ${isOpen ? styles.triggerActive : ""} ${disabled ? styles.disabled : ""} ${error ? styles.triggerError : ""} glass-card`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className={styles.selectedTags}>
            {selectedOptions.length > 0 ? (
              selectedOptions.map((opt) => (
                <span key={opt.value} className={styles.tag}>
                  {opt.label}
                  <button
                    className={styles.tagRemove}
                    onClick={(e) => removeOption(opt.value, e)}
                    type="button"
                  >
                    <CustomIcon name="X" size={12} />
                  </button>
                </span>
              ))
            ) : (
              <span className={styles.placeholder}>{placeholder}</span>
            )}
          </div>
          <CustomIcon
            name="ChevronDown"
            size={18}
            className={`${styles.arrow} ${isOpen ? styles.arrowRotate : ""}`}
          />
        </div>

        {error && (
          <span
            className={styles.errorText}
            style={{ marginTop: 4, display: "block" }}
          >
            {error}
          </span>
        )}

        {isOpen && (
          <div className={`${styles.dropdown} glass-card animate-fade-in`}>
            <input
              className={styles.searchInput}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {filteredOptions.length === 0 ? (
              <div className={styles.noOptions}>No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(option.value);
                    }}
                  >
                    <div
                      className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}
                    >
                      {isSelected && (
                        <CustomIcon
                          name="Check"
                          size={12}
                          style={{ color: "#fff" }}
                        />
                      )}
                    </div>
                    <div className={styles.optionContent}>
                      {option.image ? (
                        <img
                          src={option.image}
                          alt=""
                          className={styles.optionImage}
                        />
                      ) : (
                        <div className={styles.optionAvatar}>
                          {option.label.charAt(0)}
                        </div>
                      )}
                      <div className={styles.optionText}>
                        <span className={styles.optionLabel}>
                          {option.label}
                        </span>
                        {option.sublabel && (
                          <span className={styles.optionSublabel}>
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
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
          renderMultiSelect({ field, error: error?.message })
        }
      />
    );
  }

  return renderMultiSelect();
};

export default CustomMultiSelect;
