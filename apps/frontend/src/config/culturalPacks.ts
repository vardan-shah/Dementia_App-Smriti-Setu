import type { CulturalContentItem } from '../services/cultural/types';

// Assam-first demo content pack
export const CULTURAL_PACK_ASSAM: CulturalContentItem[] = [
  {
    id: 'assam_bihu',
    region: 'Assam',
    language: 'Assamese',
    theme: 'Festivals',
    title: 'Bohag Bihu',
    description: 'Bohag Bihu marks the Assamese New Year and the coming of spring.',
    prompt: 'Do you remember celebrating Bihu with your family? What special food was prepared?',
    tags: ['festival', 'spring', 'family'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  {
    id: 'assam_tea',
    region: 'Assam',
    language: 'Assamese',
    theme: 'Nature',
    title: 'Assam Tea Gardens',
    description: 'Assam is world-famous for its lush green tea gardens.',
    prompt: 'Can you picture the green tea gardens? How do you like your morning tea?',
    tags: ['nature', 'tea', 'daily life'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  {
    id: 'assam_brahmaputra',
    region: 'Assam',
    language: 'Assamese',
    theme: 'Nature',
    title: 'The Brahmaputra River',
    description: 'The Brahmaputra is the mighty river that flows through the heart of Assam.',
    prompt: 'The Brahmaputra river brings life to the valley. Have you ever taken a boat ride on it?',
    tags: ['nature', 'river', 'places'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  {
    id: 'assam_pitha',
    region: 'Assam',
    language: 'Assamese',
    theme: 'Food',
    title: 'Pitha and Laru',
    description: 'Traditional Assamese sweets like Pitha and Laru are made from rice flour, coconut, and jaggery.',
    prompt: 'Do you enjoy the taste of sweet Pitha? Who made the best Pitha in your home?',
    tags: ['food', 'sweets', 'family'],
    source: 'Curated Cultural Content',
    isDemo: true
  }
];

export const ALL_CULTURAL_CONTENT = [...CULTURAL_PACK_ASSAM];
