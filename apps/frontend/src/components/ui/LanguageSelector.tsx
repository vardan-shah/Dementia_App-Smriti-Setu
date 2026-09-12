import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <select 
      value={language}
      onChange={handleLanguageChange}
      className="border border-gray-300 rounded p-2 focus:outline-none focus:border-primary text-sm font-medium"
      aria-label="Select Language"
    >
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
      <option value="as">অসমীয়া</option>
      <option value="bn">বাংলা</option>
    </select>
  );
}
