import React, { useState, useEffect } from 'react';
import CustomIcon from "../../components/CustomIcon";
import styles from './Settings.module.css';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('theme');
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('--accent-primary') || '#7c3aed');
  const [secondaryColor, setSecondaryColor] = useState(localStorage.getItem('--accent-secondary') || '#06b6d4');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isSaved, setIsSaved] = useState(false);

  const presets = [
    { primary: '#7c3aed', secondary: '#06b6d4', name: 'Original Purple' },
    { primary: '#3b82f6', secondary: '#2dd4bf', name: 'Deep Sea' },
    { primary: '#f43f5e', secondary: '#fb923c', name: 'Sunset' },
    { primary: '#10b981', secondary: '#84cc16', name: 'Forest' },
    { primary: '#f59e0b', secondary: '#ef4444', name: 'Volcano' },
    { primary: '#6366f1', secondary: '#ec4899', name: 'Cyberpunk' },
  ];

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', primaryColor);
    document.documentElement.style.setProperty('--accent-secondary', secondaryColor);
    document.documentElement.style.setProperty('--border-active', `${primaryColor}80`);
    document.documentElement.setAttribute('data-theme', theme);
    
    localStorage.setItem('--accent-primary', primaryColor);
    localStorage.setItem('--accent-secondary', secondaryColor);
    localStorage.setItem('theme', theme);
  }, [primaryColor, secondaryColor, theme]);

  const handleReset = () => {
    setPrimaryColor('#7c3aed');
    setSecondaryColor('#06b6d4');
    setTheme('dark');
  };

  const tabs = [
    { id: 'theme', label: 'Theme', icon: <CustomIcon name="Palette" size={18} /> },
    { id: 'profile', label: 'Profile', icon: <CustomIcon name="User" size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <CustomIcon name="Bell" size={18} /> },
    { id: 'security', label: 'Security', icon: <CustomIcon name="Shield" size={18} /> },
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your application preferences and theme</p>
      </div>

      <div className={styles.container}>
        <aside className={`${styles.sidebar} glass-card`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className={`${styles.content} glass-card`}>
          {activeTab === 'theme' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <CustomIcon name="Palette" size={24} color="var(--accent-primary)" />
                <div>
                  <h3>Theme Management</h3>
                  <p>Customize the look and feel of your dashboard</p>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>Appearance Mode</label>
                <div className={styles.themeToggleGrid}>
                  <button 
                    className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <CustomIcon name="Sun" size={20} />
                    <span>Light Mode</span>
                  </button>
                  <button 
                    className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <CustomIcon name="Moon" size={20} />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>Primary Accent Color</label>
                <div className={styles.colorPickerWrapper}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className={styles.colorPicker}
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className={styles.colorInput}
                  />
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>Secondary Accent Color</label>
                <div className={styles.colorPickerWrapper}>
                  <input 
                    type="color" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)} 
                    className={styles.colorPicker}
                  />
                  <input 
                    type="text" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)} 
                    className={styles.colorInput}
                  />
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label>Theme Presets</label>
                <div className={styles.presetsGrid}>
                  {presets.map((preset, i) => (
                    <button 
                      key={i} 
                      className={styles.presetCard}
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                      }}
                      style={{ 
                        border: primaryColor === preset.primary ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)' 
                      }}
                    >
                      <div className={styles.presetPreview}>
                        <div style={{ background: preset.primary }}></div>
                        <div style={{ background: preset.secondary }}></div>
                      </div>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.resetBtn} onClick={handleReset}>
                  <CustomIcon name="RefreshCcw" size={16} /> Reset Defaults
                </button>
                <button className={styles.saveBtn} onClick={() => {
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}>
                  {isSaved ? <CustomIcon name="Check" size={16} /> : null}
                  {isSaved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'theme' && (
            <div className={styles.emptyState}>
              <CustomIcon name="Layout" size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <p>{tabs.find(t => t.id === activeTab)?.label} settings are coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;
