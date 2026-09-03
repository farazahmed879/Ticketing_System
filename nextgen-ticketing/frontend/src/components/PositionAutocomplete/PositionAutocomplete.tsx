import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  className?: string;
  disabled?: boolean;
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
  className,
  disabled = false,
}: PositionAutocompleteProps<T>) => {
  const [dbPositions, setDbPositions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch DB positions on mount for live suggestions
  useEffect(() => {
    let isMounted = true;
    api
      .get(API_ROUTES.CANDIDATES.POSITIONS)
      .then((res) => {
        if (isMounted && res.data?.positions) {
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

  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const dropdownHeight = 260;

      const spaceBelow = windowHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;

      setDropdownStyles({
        position: "fixed",
        ...(openUp
          ? { top: "auto", bottom: windowHeight - rect.top + 4 }
          : { top: rect.bottom + 4, bottom: "auto" }),
        left: rect.left,
        width: rect.width,
        zIndex: 999999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updateDropdownPosition();
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

  const renderComponent = (
    currentValue: string = "",
    handleChange: (val: string) => void,
    fieldError?: string,
  ) => {
    const errorText = manualError || fieldError;
    const filterQuery = (currentValue || "").trim().toLowerCase();

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

    // If query matches an existing option exactly, show all options so user can easily change it
    const hasExactMatch = allOptions.some(
      (opt) => opt.title.toLowerCase() === filterQuery,
    );
    const filteredOptions =
      filterQuery && !hasExactMatch
        ? allOptions.filter((opt) =>
            opt.title.toLowerCase().includes(filterQuery),
          )
        : allOptions;

    const handleSelect = (selectedTitle: string) => {
      handleChange(selectedTitle);
      setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleChange("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setIsOpen(true);
    };

    const handleToggle = () => {
      if (disabled) return;
      setIsOpen((prev) => {
        const next = !prev;
        if (next && inputRef.current) {
          inputRef.current.focus();
        }
        return next;
      });
    };

    return (
      <div
        className={`${styles.container} ${className || ""}`}
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
            isOpen ? styles.inputWrapperActive : ""
          } ${errorText ? styles.inputWrapperError : ""}`}
          onClick={() => {
            if (!disabled && inputRef.current) {
              inputRef.current.focus();
            }
          }}
        >
          <span className={styles.icon}>
            <CustomIcon name="Briefcase" size={16} />
          </span>

          <input
            ref={inputRef}
            className={styles.input}
            value={currentValue}
            disabled={disabled}
            onChange={(e) => {
              handleChange(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
              }
            }}
          />

          <div className={styles.actions}>
            {currentValue && !disabled && (
              <span
                className={styles.clearIcon}
                onClick={handleClear}
                title="Clear position"
                role="button"
                aria-label="Clear position"
              >
                <CustomIcon name="X" size={14} />
              </span>
            )}
            <span
              className={`${styles.arrow} ${isOpen ? styles.arrowRotate : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              role="button"
              aria-label="Toggle suggestions"
            >
              <CustomIcon name="ChevronDown" size={16} />
            </span>
          </div>
        </div>

        {errorText && <span className={styles.errorText}>{errorText}</span>}

        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className={`${styles.suggestions} animate-fade-in`}
              style={dropdownStyles}
            >
              {filteredOptions.length === 0 ? (
                <div className={styles.noSuggestions}>
                  Press enter or keep typing custom position
                </div>
              ) : (
                filteredOptions.slice(0, 30).map((opt) => {
                  const isSelected =
                    opt.title.toLowerCase() ===
                    (currentValue || "").trim().toLowerCase();
                  return (
                    <div
                      key={`${opt.source}-${opt.title}`}
                      className={`${styles.suggestionItem} ${
                        isSelected ? styles.suggestionItemSelected : ""
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(opt.title);
                      }}
                    >
                      <div className={styles.optionInfo}>
                        <span className={styles.optionTitle}>{opt.title}</span>
                        <span
                          className={`${styles.badge} ${
                            opt.source === "db"
                              ? styles.badgeDb
                              : styles.badgePreset
                          }`}
                        >
                          {opt.source === "db" ? "Existing" : "Suggested"}
                        </span>
                      </div>
                      {isSelected && (
                        <CustomIcon
                          name="Check"
                          size={16}
                          className={styles.checkIcon}
                        />
                      )}
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
          renderComponent(field.value || "", field.onChange, error?.message)
        }
      />
    );
  }

  return renderComponent(manualValue || "", manualOnChange || (() => {}));
};

export default PositionAutocomplete;
