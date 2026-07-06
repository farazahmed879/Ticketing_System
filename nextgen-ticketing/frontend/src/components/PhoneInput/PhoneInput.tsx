import { useState, useRef, useEffect } from 'react';
import styles from './PhoneInput.module.css';
import CustomIcon from '../CustomIcon';
import { COUNTRY_CODES } from '../../utils/constants';
import { Controller, type FieldValues } from 'react-hook-form';
import type { PhoneInputProps } from '../types';

const PhoneInput = <T extends FieldValues>({
  label,
  countryCode: manualCountryCode,
  onCountryCodeChange: manualOnCountryCodeChange,
  phone: manualPhone,
  onPhoneChange: manualOnPhoneChange,
  placeholder,
  error: manualError,
  required,
  name,
  countryCodeName,
  control
}: PhoneInputProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderPhoneInput = (phoneFieldProps: any = {}, codeFieldProps: any = {}) => {
    const phone = manualPhone !== undefined ? manualPhone : phoneFieldProps.field?.value || '';
    const countryCode = manualCountryCode !== undefined ? manualCountryCode : codeFieldProps.field?.value || '+92';
    const error = manualError || phoneFieldProps.error;
    const selectedCountry = COUNTRY_CODES.find((c: any) => c.value === countryCode) || COUNTRY_CODES[0];

    // Limit input to as many digits as the placeholder has slots (digits or X's),
    // e.g. "3XX XXXXXXX" → 10. Undefined placeholder means no limit.
    const digitLimit =
      (placeholder || "").replace(/[^0-9Xx]/g, "").length || undefined;

    const handlePhoneChange = (raw: string) => {
      // Numbers only, capped at the placeholder length.
      let digits = raw.replace(/\D/g, "");
      if (digitLimit) digits = digits.slice(0, digitLimit);
      if (manualOnPhoneChange) {
        manualOnPhoneChange(digits);
      } else if (phoneFieldProps.field?.onChange) {
        phoneFieldProps.field.onChange(digits);
      }
    };

    return (
      <div className={styles.container}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ''} glass-card`}>
          <div className={styles.codeSelector} ref={dropdownRef}>
            <div 
              className={styles.codeTrigger} 
              onClick={() => setIsOpen(!isOpen)}
            >
              <span>{selectedCountry.label.split(' ')[0]}</span>
              <span>{selectedCountry.value}</span>
              <CustomIcon 
                name="ChevronDown" 
                size={14} 
                className={isOpen ? styles.rotate : ''}
                style={{ 
                  transition: 'transform 0.3s ease',
                  transform: isOpen ? 'rotate(180deg)' : 'none'
                }}
              />
            </div>
            
            {isOpen && (
              <div className={styles.dropdown}>
                {COUNTRY_CODES.map((country: any) => (
                  <div
                    key={country.value}
                    className={`${styles.option} ${country.value === countryCode ? styles.optionSelected : ''}`}
                    onClick={() => {
                      if (manualOnCountryCodeChange) {
                        manualOnCountryCodeChange(country.value);
                      } else if (codeFieldProps.field?.onChange) {
                        codeFieldProps.field.onChange(country.value);
                      }
                      setIsOpen(false);
                    }}
                  >
                    <span className={styles.optionLabel}>{country.label}</span>
                    {country.value === countryCode && (
                      <CustomIcon name="Check" size={14} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
  
          <div className={styles.separator} />
  
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={phone}
            maxLength={digitLimit}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onKeyDown={(e) => {
              // Block obvious non-numeric single-char keys (still allow
              // navigation/editing keys and paste, which onChange sanitizes).
              if (
                e.key.length === 1 &&
                !/[0-9]/.test(e.key) &&
                !e.ctrlKey &&
                !e.metaKey
              ) {
                e.preventDefault();
              }
            }}
            onBlur={phoneFieldProps.field?.onBlur}
            placeholder={placeholder || "234 567 890"}
            required={required}
          />
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  };

  if (control && name && countryCodeName) {
    return (
      <Controller
        name={countryCodeName}
        control={control}
        render={(codeProps) => (
          <Controller
            name={name}
            control={control}
            render={(phoneProps) => 
              renderPhoneInput(
                { ...phoneProps, error: phoneProps.fieldState.error?.message },
                codeProps
              )
            }
          />
        )}
      />
    );
  }

  return renderPhoneInput();
};

export default PhoneInput;
