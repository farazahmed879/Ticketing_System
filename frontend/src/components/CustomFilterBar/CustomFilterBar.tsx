import React from 'react';
import styles from './CustomFilterBar.module.css';
import type { CustomFilterBarProps } from '../types';

const CustomFilterBar: React.FC<CustomFilterBarProps> = ({ 
  options, 
  activeOption, 
  onChange,
  containerStyle 
}) => {
  return (
    <div className={styles.filters} style={containerStyle}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`${styles.filterBtn} ${activeOption === option.value ? styles.activeFilter : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default CustomFilterBar;
