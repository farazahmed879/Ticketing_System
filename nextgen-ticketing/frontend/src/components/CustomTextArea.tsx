import React from 'react';
import styles from './CustomTextArea.module.css';

import type { CustomTextAreaProps } from './types';

const CustomTextArea: React.FC<CustomTextAreaProps> = ({
  label,
  error,
  containerStyle,
  className,
  ...props
}) => {
  return (
    <div className={styles.container} style={containerStyle}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ''} glass-card`}>
        <textarea
          className={`${styles.textarea} ${className || ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default CustomTextArea;
