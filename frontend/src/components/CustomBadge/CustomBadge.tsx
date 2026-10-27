import React from 'react';
import type { CustomBadgeProps } from '../types';

const CustomBadge: React.FC<CustomBadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  color,
  className = '',
  style 
}) => {
  const getVariantStyles = () => {
    if (color) {
      return {
        background: `${color}15`,
        color: color,
      };
    }

    switch (variant) {
      case 'success':
        return { background: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' };
      case 'danger':
        return { background: 'rgba(244, 67, 54, 0.1)', color: '#f44336' };
      case 'warning':
        return { background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' };
      case 'info':
        return { background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3' };
      case 'primary':
        return { background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-primary)' };
      case 'secondary':
        return { background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-secondary)' };
      case 'neutral':
      default:
        return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...variantStyles,
        ...style
      }}
    >
      {children}
    </span>
  );
};

export default CustomBadge;
