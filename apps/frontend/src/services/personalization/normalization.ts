import type { PerformanceRecord } from './types';

// The session object from Dexie (LocalSession with metrics payload)
export function normalizePerformance(session: any): PerformanceRecord {
  const metrics = session.metrics || {};
  
  // Extract game specific metrics cleanly
  const { difficulty, ...gameSpecificMetrics } = metrics.gameSpecificMetrics || {};
  
  return {
    id: `${session.id}_perf`,
    elderId: session.elderId,
    sessionId: session.id,
    gameId: session.gameId,
    difficulty: difficulty || 'MEDIUM', // fallback
    startedAt: session.startedAt,
    completedAt: session.completedAt || new Date().toISOString(),
    status: session.status,
    accuracy: typeof metrics.accuracy === 'number' ? metrics.accuracy : 0,
    errorRate: typeof metrics.errorRate === 'number' ? metrics.errorRate : 0,
    correct: typeof metrics.correct === 'number' ? metrics.correct : 0,
    incorrect: typeof metrics.errors === 'number' ? metrics.errors : 0, // 'errors' in useGameSession
    attempts: typeof metrics.attempts === 'number' ? metrics.attempts : 0,
    avgReactionTimeMs: typeof metrics.avgReactionTimeMs === 'number' ? metrics.avgReactionTimeMs : 0,
    totalReactionTimeMs: typeof metrics.totalReactionTimeMs === 'number' ? metrics.totalReactionTimeMs : 0,
    optionsPresented: typeof metrics.optionsPresented === 'number' ? metrics.optionsPresented : 0,
    timeOfDay: typeof metrics.timeOfDay === 'number' ? metrics.timeOfDay : new Date(session.startedAt).getHours(),
    locale: gameSpecificMetrics.selectedLocale || 'en-IN',
    gameSpecificMetrics,
    createdAt: new Date().toISOString(),
  };
}
