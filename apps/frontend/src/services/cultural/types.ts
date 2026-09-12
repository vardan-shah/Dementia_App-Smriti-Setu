export interface CulturalProfile {
  id: string; // elderId
  elderId: string;
  region: string;
  preferredLanguage: string;
  secondaryLanguage?: string;
  preferredThemes: string[];
  customNotes?: string;
  updatedAt: string;
}

export interface LocalizedText {
  en: string;
  hi?: string;
  as?: string;
  bn?: string;
}

export interface CulturalContentItem {
  id: string;
  region: string;
  contentLocaleSupport: string[];
  theme: string;
  title: LocalizedText;
  description: LocalizedText;
  prompt: LocalizedText;
  tags: string[];
  source: string;
  isDemo: boolean;
}

export interface DailyPlan {
  id: string; // e.g., `${elderId}_${YYYY-MM-DD}`
  elderId: string;
  date: string; // YYYY-MM-DD local time
  activityId: string;
  culturalPromptId?: string;
  memoryId?: string;
  language: string;
  generatedLocally: boolean;
  completed: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  elderId: string;
  title: string;
  time: string; // HH:mm format
  enabled: boolean;
  recurrence: 'DAILY' | 'WEEKLY' | 'ONCE';
  completedToday: boolean;
  lastCompletedDate?: string;
  createdAt: string;
}

export function resolveLocalizedText(text: LocalizedText, language: string): string {
  if (language === 'as' && text.as) return text.as;
  if (language === 'hi' && text.hi) return text.hi;
  if (language === 'bn' && text.bn) return text.bn;
  return text.en; // Fallback
}
