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

export interface CulturalContentItem {
  id: string;
  region: string; // e.g., 'Assam', 'Meghalaya'
  language: string;
  theme: string;
  title: string;
  description: string;
  prompt: string;
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
  completedToday: boolean;
  lastCompletedDate?: string;
  createdAt: string;
}
