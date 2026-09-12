export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface AdaptiveArmState {
  id: string;              // uuid (client-generated)
  elderId: string;
  gameId: string;
  difficulty: DifficultyLevel;
  contextKey: string;      // Hash/string of performance + engagement
  selectionCount: number;
  meanReward: number;
  rewardVariance: number;
  lastSelectedAt: string;
  updatedAt: string;
}

export interface AdaptiveDecision {
  id: string;              // uuid (client-generated)
  elderId: string;
  gameId: string;
  sessionId?: string;      // linked later when session is created
  contextKey: string;
  difficulty: DifficultyLevel;
  wasExploration: boolean;
  estimatedReward: number;
  reason: string;
  createdAt: string;
}

// For epsilon greedy
export const ADAPTIVE_CONSTANTS = {
  INITIAL_EPSILON: 0.20,
  MIN_EPSILON: 0.05,
  EPSILON_DECAY_RATE: 0.01,
  REWARD_BOUND: 1.0,       // [-1, 1]
};
