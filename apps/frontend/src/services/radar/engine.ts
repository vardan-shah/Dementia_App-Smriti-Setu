import { db } from '../../db';
import type { CognitiveCategory } from '../personalization/types';
import type { ChangeSignal, ChangeDirection, ChangeSeverity, ChangeStatus } from './types';
import { GAME_REGISTRY } from '../../config/games';

const CONFIG = {
  RECENT_WINDOW_SESSIONS: 5,
  PERSISTENCE_THRESHOLD: 3, // 1=NONE, 2=WATCH, 3+=PERSISTENT
  MIN_SESSIONS_FOR_RADAR: 5,
  THRESHOLDS: {
    accuracyDrop: 0.15, // 15% drop is a negative deviation
    reactionIncreaseMs: 300, // 300ms slower is a negative deviation
    engagementDrop: 0.20
  }
};

export async function evaluateChangeSignals(elderId: string): Promise<ChangeSignal[]> {
  const categories: CognitiveCategory[] = ['Memory', 'Language', 'Reaction', 'Engagement'];
  const signals: ChangeSignal[] = [];

  for (const category of categories) {
    const signal = await evaluateCategory(elderId, category);
    if (signal) {
      signals.push(signal);
    }
  }

  // Attention is intentionally omitted / NOT_YET_MEASURED
  const attentionSignal: ChangeSignal = {
    id: `${elderId}_Attention`,
    elderId,
    category: 'Attention',
    metric: 'accuracy',
    baselineValue: 0,
    currentValue: 0,
    delta: 0,
    direction: 'UNKNOWN',
    severity: 'NONE',
    persistenceCount: 0,
    sampleCount: 0,
    lastObservedAt: new Date().toISOString(),
    status: 'INSUFFICIENT_DATA',
    explanation: 'Attention is not yet measured by available activities.'
  };
  signals.push(attentionSignal);

  await db.transaction('rw', db.changeSignals, async () => {
    for (const sig of signals) {
      await db.changeSignals.put(sig);
    }
  });

  return signals;
}

async function evaluateCategory(elderId: string, category: CognitiveCategory): Promise<ChangeSignal | null> {
  const baseline = await db.cognitiveBaselines.where('[elderId+category]').equals([elderId, category]).first();
  const existingSignal = await db.changeSignals.get(`${elderId}_${category}`);
  
  if (!baseline || baseline.sampleCount < CONFIG.MIN_SESSIONS_FOR_RADAR) {
    return {
      id: `${elderId}_${category}`,
      elderId,
      category,
      metric: category === 'Reaction' ? 'avgReactionTimeMs' : 'accuracy',
      baselineValue: 0,
      currentValue: 0,
      delta: 0,
      direction: 'UNKNOWN',
      severity: 'NONE',
      persistenceCount: 0,
      sampleCount: baseline?.sampleCount || 0,
      lastObservedAt: new Date().toISOString(),
      status: 'INSUFFICIENT_DATA',
      explanation: 'Building personal history...'
    };
  }

  // Fetch recent records for this category
  const allRecords = await db.performanceRecords
    .where('elderId')
    .equals(elderId)
    .reverse()
    .toArray();

  let relevantRecords = [];
  if (category === 'Engagement') {
    relevantRecords = allRecords;
  } else if (category === 'Reaction') {
    relevantRecords = allRecords.filter(r => r.status === 'COMPLETED' && r.avgReactionTimeMs > 0);
  } else {
    // Memory, Language
    const targetGames = Object.values(GAME_REGISTRY)
      .filter(g => g.cognitiveCategories.includes(category))
      .map(g => g.id);
    relevantRecords = allRecords.filter(r => r.status === 'COMPLETED' && targetGames.includes(r.gameId));
  }

  const recentRecords = relevantRecords.slice(0, CONFIG.RECENT_WINDOW_SESSIONS);

  if (recentRecords.length === 0) {
    return existingSignal || null;
  }

  let metric: 'accuracy' | 'avgReactionTimeMs' | 'completionRate' = 'accuracy';
  let recentMean = 0;
  let isNegativeDeviation = (r: any) => false;
  let isPositiveDeviation = (r: any) => false;

  if (category === 'Engagement') {
    metric = 'completionRate';
    const completed = recentRecords.filter(r => r.status === 'COMPLETED').length;
    recentMean = completed / recentRecords.length;
    // We check the overall recent mean against baseline for engagement
    const delta = recentMean - baseline.mean;
    isNegativeDeviation = () => delta <= -CONFIG.THRESHOLDS.engagementDrop;
    isPositiveDeviation = () => delta >= CONFIG.THRESHOLDS.engagementDrop;
  } else if (category === 'Reaction') {
    metric = 'avgReactionTimeMs';
    recentMean = recentRecords.reduce((sum, r) => sum + r.avgReactionTimeMs, 0) / recentRecords.length;
    isNegativeDeviation = (r: any) => (r.avgReactionTimeMs - baseline.mean) >= CONFIG.THRESHOLDS.reactionIncreaseMs;
    isPositiveDeviation = (r: any) => (baseline.mean - r.avgReactionTimeMs) >= CONFIG.THRESHOLDS.reactionIncreaseMs;
  } else {
    metric = 'accuracy';
    recentMean = recentRecords.reduce((sum, r) => sum + r.accuracy, 0) / recentRecords.length;
    isNegativeDeviation = (r: any) => (baseline.mean - r.accuracy) >= CONFIG.THRESHOLDS.accuracyDrop;
    isPositiveDeviation = (r: any) => (r.accuracy - baseline.mean) >= CONFIG.THRESHOLDS.accuracyDrop;
  }

  // Count persistence of negative deviations in the recent window
  let negativeCount = 0;
  if (category === 'Engagement') {
    negativeCount = isNegativeDeviation(null) ? CONFIG.PERSISTENCE_THRESHOLD : 0;
  } else {
    recentRecords.forEach(r => {
      if (isNegativeDeviation(r)) negativeCount++;
    });
  }

  let direction: ChangeDirection = 'STABLE';
  let severity: ChangeSeverity = 'NONE';
  let status: ChangeStatus = 'RESOLVED';
  
  if (negativeCount >= 3) {
    direction = 'DECLINING';
    severity = 'PERSISTENT';
    status = 'ACTIVE';
  } else if (negativeCount === 2) {
    direction = 'DECLINING';
    severity = 'WATCH';
    status = 'ACTIVE';
  } else if (negativeCount === 1) {
    direction = 'DECLINING';
    severity = 'NONE';
    // If previously active, it might still be resolving, but let's drop status to ACTIVE but severity NONE
    status = existingSignal?.status === 'ACTIVE' ? 'ACTIVE' : 'RESOLVED';
  } else {
    // Check if improving
    let positiveCount = 0;
    if (category !== 'Engagement') {
      recentRecords.forEach(r => {
        if (isPositiveDeviation(r)) positiveCount++;
      });
    } else {
      positiveCount = isPositiveDeviation(null) ? CONFIG.PERSISTENCE_THRESHOLD : 0;
    }
    
    if (positiveCount >= 2) {
      direction = 'IMPROVING';
    }
  }

  const delta = recentMean - baseline.mean;

  // Build explanation
  let explanation = `Performance is stable.`;
  if (severity === 'PERSISTENT') {
    explanation = `Recent ${metric} has remained significantly ${direction === 'DECLINING' ? 'worse' : 'different'} than the personal baseline across multiple activities.`;
  } else if (severity === 'WATCH') {
    explanation = `Recent ${metric} is showing moderate deviation from the personal baseline. Monitoring required.`;
  } else if (direction === 'IMPROVING') {
    explanation = `Recent ${metric} is tracking above the personal baseline.`;
  } else if (existingSignal?.status === 'ACTIVE' && status === 'RESOLVED') {
    explanation = `Previous deviation has stabilized and returned to normal baseline levels.`;
  }

  return {
    id: `${elderId}_${category}`,
    elderId,
    category,
    metric,
    baselineValue: baseline.mean,
    currentValue: recentMean,
    delta,
    direction,
    severity,
    persistenceCount: negativeCount,
    sampleCount: recentRecords.length,
    firstDetectedAt: existingSignal?.firstDetectedAt || (status === 'ACTIVE' ? new Date().toISOString() : undefined),
    lastObservedAt: new Date().toISOString(),
    status,
    explanation
  };
}
