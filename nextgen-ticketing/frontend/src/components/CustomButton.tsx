import React from 'react';
import styles from './CustomButton.module.css';
import type { CustomButtonProps } from './types';

const CustomButton: React.FC<CustomButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className = '',
  style,
  disabled,
  ...props 
}) => {
  return (
    <button
      className={`
        ${styles.button} 
        ${styles[variant]} 
        ${styles[size]} 
        ${fullWidth ? styles.fullWidth : ''} 
        ${loading ? styles.loading : ''} 
        ${className}
      `}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
};

export default CustomButton;
