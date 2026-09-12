import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en/translation.json';
import hi from './hi/translation.json';
import as from './as/translation.json';
import bn from './bn/translation.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  as: { translation: as },
  bn: { translation: bn },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
