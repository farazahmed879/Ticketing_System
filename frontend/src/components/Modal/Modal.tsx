import React from 'react';
import ReactDOM from 'react-dom';
import CustomIcon from '../CustomIcon';
import styles from './Modal.module.css';

import type { ModalProps } from '../types';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth, minHeight, height, headerAction, className }) => {
  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    maxWidth: maxWidth || '550px',
    minHeight: minHeight || 'auto',
    ...(height ? { height } : {}),
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${className || ''} glass-card animate-fade-in`} style={modalStyle}>
        {title ? (
          <div className={styles.header}>
            <h2>{title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {headerAction}
              <button onClick={onClose} className={styles.closeBtn}>
                <CustomIcon name="X" size={20} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={onClose} className={styles.closeBtn} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
            <CustomIcon name="X" size={20} />
          </button>
        )}
        <div className={styles.content}>
          {children}
        </div>
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
