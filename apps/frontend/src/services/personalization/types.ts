export interface PerformanceRecord {
  id: string;
  elderId: string;
  sessionId: string;
  gameId: string;
  difficulty: string;
  startedAt: string;
  completedAt: string;
  status: 'STARTED' | 'COMPLETED' | 'ABANDONED';
  accuracy: number;
  errorRate: number;
  correct: number;
  incorrect: number;
  attempts: number;
  avgReactionTimeMs: number;
  totalReactionTimeMs: number;
  optionsPresented: number;
  timeOfDay: number;
  locale: string;
  gameSpecificMetrics: Record<string, any>;
  createdAt: string;
}

export type CognitiveCategory = 'Memory' | 'Attention' | 'Language' | 'Reaction' | 'Engagement';

export interface CognitiveBaseline {
  id: string;
  elderId: string;
  category: CognitiveCategory;
  mean: number;
  variance: number;
  sampleCount: number;
  lastUpdatedAt: string;
  sourceGameIds: string[];
}

export type ProfileConfidence = 'INSUFFICIENT_DATA' | 'BUILDING_BASELINE' | 'STABLE_BASELINE' | 'NOT_YET_MEASURED';

export interface ReactionMetrics {
  currentMs: number;
  baselineMs: number;
  differenceMs: number;
  trend: 'Improving' | 'Stable' | 'Declining';
}

export interface CognitiveProfileScore {
  category: CognitiveCategory;
  confidence: ProfileConfidence;
  score?: number; // 0-100 normalized score for Accuracy/Engagement
  reactionMetrics?: ReactionMetrics;
}

export interface CognitiveProfile {
  elderId: string;
  scores: CognitiveProfileScore[];
  lastUpdatedAt: string;
}
