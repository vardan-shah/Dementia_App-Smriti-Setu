import type { CognitiveCategory } from '../personalization/types';

export type ChangeDirection = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN';
export type ChangeSeverity = 'NONE' | 'WATCH' | 'PERSISTENT';
export type ChangeStatus = 'ACTIVE' | 'RESOLVED' | 'INSUFFICIENT_DATA';

export interface ChangeSignal {
  id: string; // usually `${elderId}_${category}`
  elderId: string;
  category: CognitiveCategory;
  metric: 'accuracy' | 'avgReactionTimeMs' | 'completionRate';
  baselineValue: number;
  currentValue: number; // Recent mean
  delta: number;
  direction: ChangeDirection;
  severity: ChangeSeverity;
  persistenceCount: number;
  sampleCount: number;
  firstDetectedAt?: string;
  lastObservedAt: string;
  status: ChangeStatus;
  explanation: string;
}
