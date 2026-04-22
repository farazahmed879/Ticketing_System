import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';
import styles from './CustomSelect.module.css';

import type { CustomSelectProps } from './types';

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  className,
  disabled = false,
  required = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`${styles.container} ${className || ''}`} ref={containerRef} style={style}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span style={{ color: 'var(--accent-danger)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      
      {/* Hidden input for native form validation */}
      <input 
        tabIndex={-1}
        autoComplete="off"
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        value={value}
        required={required}
        onChange={() => {}}
      />
      
      <div 
        className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''} ${disabled ? styles.disabled : ''} glass-card`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className={styles.currentValue}>
          {selectedOption ? (
            <div className={styles.optionContent}>
              {selectedOption.image && <img src={selectedOption.image} alt="" className={styles.optionImage} />}
              {selectedOption.icon && <span className={styles.optionIcon}>{selectedOption.icon}</span>}
              <span className={styles.text}>{selectedOption.label}</span>
            </div>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={`${styles.arrow} ${isOpen ? styles.arrowRotate : ''}`} />
      </div>

      {isOpen && (
        <div className={`${styles.dropdown} glass-card animate-fade-in`}>
          {options.length === 0 ? (
            <div className={styles.noOptions}>No options available</div>
          ) : (
            options.map((option) => (
              <div 
                key={option.value}
                className={`${styles.option} ${value === option.value ? styles.optionSelected : ''} ${option.disabled ? styles.optionDisabled : ''}`}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <div className={styles.optionContent}>
                  {option.image && <img src={option.image} alt="" className={styles.optionImage} />}
                  {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
                  <span className={styles.text}>{option.label}</span>
                </div>
                {value === option.value && <Check size={16} className={styles.checkIcon} />}
                {option.disabled && <Lock size={14} className={styles.lockIcon} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
