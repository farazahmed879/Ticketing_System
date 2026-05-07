import React from 'react';
import Modal from '../Modal';
import CustomButton from '../CustomButton';
import CustomIcon from '../CustomIcon';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

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
      title={title}
      footer={
        <>
          <CustomButton variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </CustomButton>
          <CustomButton 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm} 
            loading={loading}
          >
            {confirmText}
          </CustomButton>
        </>
      }
    >
      <div className={styles.container}>
        <div className={`${styles.iconWrapper} ${styles[type]}`}>
          {getIcon()}
        </div>
        <p className={styles.message}>{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
