import { useState, useRef, useEffect } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';
import CustomIcon from './CustomIcon';
import styles from './CustomSelect.module.css';

import type { CustomSelectProps } from './types';

const CustomSelect = <T extends FieldValues>({
  options,
  value: manualValue,
  onChange: manualOnChange,
  placeholder = 'Select option...',
  label,
  className,
  disabled = false,
  required = false,
  style,
  name,
  control,
  rules,
  error: manualError,
  isMulti = false,
  icon: triggerIcon,
  showSearch = false,
  onSearch,
  serverSideSearch = false,
}: CustomSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderSelect = (fieldProps: any = {}) => {
    const value = manualValue !== undefined ? manualValue : fieldProps.field?.value;
    const onChange = manualOnChange || fieldProps.field?.onChange;
    const error = manualError || fieldProps.error;
    
    const isSelected = (val: string) => {
      if (isMulti && Array.isArray(value)) {
        return value.includes(val);
      }
      return value === val;
    };

    const handleOptionClick = (optionValue: string) => {
      if (isMulti) {
        const currentValues = Array.isArray(value) ? value : [];
        const newValue = currentValues.includes(optionValue)
          ? currentValues.filter(v => v !== optionValue)
          : [...currentValues, optionValue];
        onChange?.(newValue);
      } else {
        onChange?.(optionValue);
        setIsOpen(false);
      }
    };

    const getSelectedLabel = () => {
      if (isMulti && Array.isArray(value)) {
        if (value.length === 0) return null;
        if (value.length === 1) return options.find(opt => opt.value === value[0])?.label;
        return `${value.length} Selected`;
      }
      return options.find(opt => opt.value === value)?.label;
    };

    const selectedOption = !isMulti ? options.find(opt => opt.value === value) : null;
    const selectedLabel = getSelectedLabel();

    const [search, setSearch] = useState('');

    const filteredOptions = serverSideSearch 
      ? options 
      : options.filter(opt =>
          opt.label.toLowerCase().includes(search.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
        );

    useEffect(() => {
      if (!isOpen) setSearch('');
    }, [isOpen]);

    return (
      <div className={`${styles.container} ${isOpen ? styles.containerActive : ''} ${className || ''}`} ref={containerRef} style={style}>
        {label && (
          <label className={styles.label}>
            {label}
            {required && <span style={{ color: 'var(--accent-danger)', marginLeft: 4 }}>*</span>}
          </label>
        )}
        
        <div 
          className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''} ${disabled ? styles.disabled : ''} ${error ? styles.triggerError : ''} glass-card`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className={styles.currentValue}>
            {selectedLabel ? (
              <div className={styles.optionContent}>
                {triggerIcon && <span className={styles.optionIcon}>{triggerIcon}</span>}
                {!isMulti && selectedOption?.image && <img src={selectedOption.image} alt="" className={styles.optionImage} />}
                {!isMulti && selectedOption?.icon && <span className={styles.optionIcon}>{selectedOption.icon}</span>}
                <span className={styles.text}>{selectedLabel}</span>
              </div>
            ) : (
              <div className={styles.optionContent}>
                {triggerIcon && <span className={styles.optionIcon}>{triggerIcon}</span>}
                <span className={styles.placeholder}>{placeholder}</span>
              </div>
            )}
          </div>
          <CustomIcon name="ChevronDown" size={18} className={`${styles.arrow} ${isOpen ? styles.arrowRotate : ''}`} />
        </div>

        {error && <span className={styles.errorText} style={{ marginTop: 4, display: 'block' }}>{error}</span>}

        {isOpen && (
          <div className={`${styles.dropdown} glass-card animate-fade-in`}>
            {showSearch && (
              <div className={styles.searchWrapper}>
                <CustomIcon name="Search" size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearch(val);
                    onSearch?.(val);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className={styles.noOptions}>No options available</div>
            ) : (
              filteredOptions.map((option) => {
                const selected = isSelected(option.value);
                return (
                  <div 
                    key={option.value}
                    className={`${styles.option} ${selected ? styles.optionSelected : ''} ${option.disabled ? styles.optionDisabled : ''}`}
                    onClick={(e) => {
                      if (option.disabled) return;
                      if (isMulti) e.stopPropagation();
                      handleOptionClick(option.value);
                    }}
                  >
                    <div className={styles.optionContent}>
                      {option.image && <img src={option.image} alt="" className={styles.optionImage} />}
                      {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
                      <div className={styles.optionText}>
                        <span className={styles.text}>{option.label}</span>
                        {option.sublabel && <span className={styles.subtext}>{option.sublabel}</span>}
                      </div>
                    </div>
                    {selected && <CustomIcon name="Check" size={16} className={styles.checkIcon} />}
                    {option.disabled && <CustomIcon name="Lock" size={14} className={styles.lockIcon} />}
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
          renderSelect({ field, error: error?.message })
        }
      />
    );
  }

  return renderSelect();
};

export default CustomSelect;
