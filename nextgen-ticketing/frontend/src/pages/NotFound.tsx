import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomIcon from '../components/CustomIcon';
import styles from './NotFound.module.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.backgroundBlobs}>
        <div className={`${styles.blob} ${styles.blob1}`}></div>
        <div className={`${styles.blob} ${styles.blob2}`}></div>
      </div>
      
      <div className={`${styles.card} glass-card`}>
        <div className={styles.iconWrapper}>
          <div className={styles.pulseRing}></div>
          <CustomIcon name="Search" size={64} color="var(--accent-primary)" />
        </div>
        
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.description}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <div className={styles.actions}>
          <button 
            className={styles.homeButton} 
            onClick={() => navigate('/')}
          >
            <CustomIcon name="Home" size={18} />
            Back to Home
          </button>
          <button 
            className={styles.backButton} 
            onClick={() => navigate(-1)}
          >
            <CustomIcon name="ArrowLeft" size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
