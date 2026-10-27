import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Controller, type FieldValues } from "react-hook-form";
import CustomIcon from "../CustomIcon";
import styles from "./CustomMultiSelect.module.css";
import type { CustomMultiSelectProps } from "../types";
import CustomImage from "../CustomImage";

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
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const dropdownHeight = 240; // Match max-height in CSS

      const spaceBelow = windowHeight - rect.bottom;
      // Flip up only when there isn't room below but there is above.
      const openUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;

      setDropdownStyles({
        position: "fixed",
        // When opening upward, anchor the menu's BOTTOM to the trigger's top.
        ...(openUp
          ? { top: "auto", bottom: windowHeight - rect.top + 4 }
          : { top: rect.bottom + 4, bottom: "auto" }),
        left: rect.left,
        width: rect.width,
        zIndex: 999999,
      });
    }
  }, [isOpen]);

  // Compute position synchronously before paint so the dropdown never renders
  // with its CSS-default absolute position (which, portaled to <body>, would
  // stretch to the document bottom and break the modal overlay on first open).
  useLayoutEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    } else {
      setDropdownStyles({});
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(`.${styles.dropdown}`)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

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

        {isOpen &&
          dropdownStyles.position &&
          createPortal(
            <div
              className={`${styles.dropdown} glass-card animate-fade-in`}
              style={dropdownStyles}
              onMouseDown={(e) => e.stopPropagation()}
            >
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
                        <CustomImage
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
            </div>,
            document.body,
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
