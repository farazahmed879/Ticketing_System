import React from 'react';
import CustomIcon from "../../components/CustomIcon";
import { useAuth } from "../../context/AuthContext";
import styles from './Profile.module.css';

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const profileGroups = [
    {
      title: 'Personal Information',
      items: [
        { label: 'Full Name', value: user.fullname, icon: <CustomIcon name="User" size={18} /> },
        { label: 'Email Address', value: user.email, icon: <CustomIcon name="Mail" size={18} /> },
        { label: 'Contact Number', value: '+1 234 567 890', icon: <CustomIcon name="Phone" size={18} /> },
      ]
    },
    {
      title: 'Professional Details',
      items: [
        { label: 'Job Title', value: user.title || 'Support Professional', icon: <CustomIcon name="Briefcase" size={18} /> },
        { label: 'Department', value: 'Operations', icon: <CustomIcon name="Building" size={18} /> },
        { label: 'Role', value: user.role.name, icon: <CustomIcon name="Shield" size={18} /> },
      ]
    },
    {
      title: 'Account Settings',
      items: [
        { label: 'Joined Date', value: 'January 12, 2024', icon: <CustomIcon name="Calendar" size={18} /> },
      ]
    }
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <div className={styles.cover}></div>
        <div className={styles.profileMeta}>
          <div className={styles.avatarLarge}>
            <CustomIcon name="User" size={48} />
          </div>
          <div className={styles.nameSection}>
            <h1>{user.fullname}</h1>
            <p>{user.title || user.role.name}</p>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <div className={`${styles.card} glass-card`}>
            <h3>Bio</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Dedicated professional focused on delivering exceptional support and managing system efficiency. 
              Passionate about solving complex technical issues and improving user experiences.
            </p>
          </div>
        </div>

        <div className={styles.rightCol}>
          {profileGroups.map((group, i) => (
            <div key={i} className={`${styles.card} glass-card`}>
              <h3 className={styles.cardTitle}>{group.title}</h3>
              <div className={styles.detailsList}>
                {group.items.map((item, j) => (
                  <div key={j} className={styles.detailItem}>
                    <div className={styles.iconWrapper}>{item.icon}</div>
                    <div className={styles.detailContent}>
                      <span className={styles.label}>{item.label}</span>
                      <span className={styles.value}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
