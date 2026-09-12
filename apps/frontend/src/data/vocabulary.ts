export interface LocalizedVocabulary {
  id: string;
  image: string;
  translations: {
    en: string;
    hi: string;
    as: string;
    bn: string;
  };
}

export const VOCABULARY: LocalizedVocabulary[] = [
  {
    id: 'apple',
    image: '🍎',
    translations: { en: 'Apple', hi: 'सेब', as: 'আপেল', bn: 'আপেল' }
  },
  {
    id: 'bicycle',
    image: '🚲',
    translations: { en: 'Bicycle', hi: 'साइकिल', as: 'চাইকেল', bn: 'বাইসাইকেল' }
  },
  {
    id: 'dog',
    image: '🐶',
    translations: { en: 'Dog', hi: 'कुत्ता', as: 'কুকুৰ', bn: 'কুকুর' }
  },
  {
    id: 'car',
    image: '🚗',
    translations: { en: 'Car', hi: 'गाड़ी', as: 'গাড়ী', bn: 'গাড়ি' }
  },
  {
    id: 'house',
    image: '🏠',
    translations: { en: 'House', hi: 'घर', as: 'ঘৰ', bn: 'বাড়ি' }
  },
  {
    id: 'book',
    image: '📖',
    translations: { en: 'Book', hi: 'किताब', as: 'কিতাপ', bn: 'বই' }
  },
  {
    id: 'flower',
    image: '🌺',
    translations: { en: 'Flower', hi: 'फूल', as: 'ফুল', bn: 'ফুল' }
  },
  {
    id: 'cat',
    image: '🐱',
    translations: { en: 'Cat', hi: 'बिल्ली', as: 'মেকুৰী', bn: 'বিড়াল' }
  },
  {
    id: 'tree',
    image: '🌳',
    translations: { en: 'Tree', hi: 'पेड़', as: 'গছ', bn: 'গাছ' }
  },
  {
    id: 'sun',
    image: '☀️',
    translations: { en: 'Sun', hi: 'सूरज', as: 'সূৰ্য', bn: 'সূর্য' }
  }
];
