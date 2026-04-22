import React from 'react';
import styles from './CustomInput.module.css';

import type { CustomInputProps } from './types';

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  icon,
  suffix,
  containerStyle,
  className,
  ...props
}) => {
  return (
    <div className={styles.container} style={containerStyle}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ''} glass-card`}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          className={`${styles.input} ${className || ''}`}
          {...props}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default CustomInput;
