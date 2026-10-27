import React from 'react';
import Modal from '../Modal';
import CustomButton from '../CustomButton';
import CustomIcon from '../CustomIcon';
import styles from './ConfirmationModal.module.css';

import type { ConfirmationModalProps } from '../types';

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger': return <CustomIcon name="AlertCircle" size={48} />;
      case 'warning': return <CustomIcon name="AlertTriangle" size={48} />;
      case 'success': return <CustomIcon name="CheckCircle2" size={48} />;
      default: return <CustomIcon name="Info" size={48} />;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      maxWidth="400px"
    >
      <div className={styles.container}>
        <div className={`${styles.iconWrapper} ${styles[type]}`}>
          {getIcon()}
          <div className={`${styles.iconGlow} ${styles[`${type}Glow`]}`} />
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.actions}>
          <CustomButton variant="outline" onClick={onClose} disabled={loading} style={{ flex: 1, padding: '12px' }}>
            {cancelText}
          </CustomButton>
          <CustomButton 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm} 
            loading={loading}
            style={{ flex: 1, padding: '12px' }}
          >
            {confirmText}
          </CustomButton>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
