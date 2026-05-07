import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';
import { Languages } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      className={styles.switcher} 
      onClick={toggleLanguage}
      title={t('languages.' + (i18n.language === 'en' ? 'ar' : 'en'))}
    >
      <Languages size={20} />
      <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
    </button>
  );
};

export default LanguageSwitcher;
