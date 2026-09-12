import { db } from '../../db';
import type { PerformanceRecord } from './types';
import { type DifficultyLevel, type AdaptiveArmState, type AdaptiveDecision, ADAPTIVE_CONSTANTS } from './adaptiveTypes';

export function calculateContextKey(recentRecords: PerformanceRecord[], lastDifficulty?: string): string {
  // If not enough records, default to MEDIUM context
  if (!recentRecords || recentRecords.length === 0) {
    return 'MODERATE_MEDIUM_MEDIUM';
  }

  // 1. Performance Band
  const completed = recentRecords.filter(r => r.status === 'COMPLETED');
  const avgAccuracy = completed.length > 0
    ? completed.reduce((sum, r) => sum + (r.accuracy || 0), 0) / completed.length
    : 0;
  
  let perfBand = 'MODERATE';
  if (avgAccuracy > 85) perfBand = 'STRONG';
  else if (avgAccuracy < 50) perfBand = 'WEAK';

  // 2. Engagement Band
  const completionRate = recentRecords.length > 0 
    ? completed.length / recentRecords.length 
    : 0;
  
  let engBand = 'MEDIUM';
  if (completionRate > 0.8) engBand = 'HIGH';
  else if (completionRate < 0.5) engBand = 'LOW';

  // 3. Difficulty Band
  const diffBand = lastDifficulty ? lastDifficulty.toUpperCase() : 'MEDIUM';

  return `${perfBand}_${engBand}_${diffBand}`;
}

export function calculateReward(record: PerformanceRecord): number {
  if (record.status === 'ABANDONED') return -1.0;
  
  let reward = 0.5; // Base for completion
  const metrics = record;
  
  // Accuracy contribution [-0.5, +0.5]
  if (record.accuracy !== undefined) {
    const accuracyNormalized = (record.accuracy / 100) * 2 - 1; // 0= -1, 50= 0, 100= +1
    reward += accuracyNormalized * 0.4;
  }
  
  // Error threshold penalty
  if (record.incorrect && record.incorrect > 3) {
    reward -= 0.3;
  }
  
  // Reaction time (if tracked, but let's keep it simple for now)
  return Math.max(-1, Math.min(1, reward));
}

export async function selectDifficulty(elderId: string, gameId: string, recentRecords: PerformanceRecord[] = []): Promise<{
  selectedDifficulty: DifficultyLevel;
  reason: string;
  isExploration: boolean;
}> {
  const lastRecord = recentRecords.length > 0 ? recentRecords[0] : undefined;
  const lastDifficulty = lastRecord?.difficulty || 'MEDIUM';
  const contextKey = calculateContextKey(recentRecords, lastDifficulty);

  // Get arms for this elder/game
  const arms = await db.adaptiveArmStates.where('[elderId+gameId]').equals([elderId, gameId]).toArray();
  const contextArms = arms.filter(a => a.contextKey === contextKey);
  
  const totalSelections = arms.reduce((sum, a) => sum + a.selectionCount, 0);
  
  // Epsilon decay
  let epsilon = ADAPTIVE_CONSTANTS.INITIAL_EPSILON - (totalSelections * ADAPTIVE_CONSTANTS.EPSILON_DECAY_RATE);
  epsilon = Math.max(ADAPTIVE_CONSTANTS.MIN_EPSILON, epsilon);

  // If no history at all or very sparse, fallback to deterministic or exploration
  if (arms.length === 0) {
    return _recordDecision(elderId, gameId, contextKey, 'MEDIUM', true, 0, 'No historical data. Defaulting to MEDIUM.');
  }

  const isExploration = Math.random() < epsilon;

  let chosenDifficulty: DifficultyLevel = 'MEDIUM';
  let reason = '';
  let estimatedReward = 0;

  if (isExploration || contextArms.length === 0) {
    // Pick random difficulty bounded by 1 step from last difficulty
    chosenDifficulty = _getBoundedRandomDifficulty(lastDifficulty as DifficultyLevel);
    reason = isExploration 
      ? `Exploration step (epsilon=${epsilon.toFixed(2)})` 
      : `No contextual data for ${contextKey}. Exploring bounds.`;
    // Find expected reward from general arms if any
    const arm = arms.find(a => a.difficulty === chosenDifficulty);
    estimatedReward = arm ? arm.meanReward : 0;
  } else {
    // Exploitation: Pick arm with highest mean reward in this context
    const bestArm = contextArms.reduce((prev, current) => (prev.meanReward > current.meanReward) ? prev : current);
    
    // Safety Bound check
    chosenDifficulty = _boundDifficulty(lastDifficulty as DifficultyLevel, bestArm.difficulty);
    
    if (chosenDifficulty !== bestArm.difficulty) {
      reason = `Exploiting highest reward, bounded by safety rules (would have picked ${bestArm.difficulty})`;
      estimatedReward = bestArm.meanReward;
    } else {
      reason = `Exploiting highest contextual reward (${bestArm.meanReward.toFixed(2)})`;
      estimatedReward = bestArm.meanReward;
    }
  }

  return _recordDecision(elderId, gameId, contextKey, chosenDifficulty, isExploration, estimatedReward, reason);
}

async function _recordDecision(
  elderId: string, 
  gameId: string, 
  contextKey: string, 
  difficulty: DifficultyLevel, 
  wasExploration: boolean, 
  estimatedReward: number,
  reason: string
) {
  const decision: AdaptiveDecision = {
    id: crypto.randomUUID(),
    elderId,
    gameId,
    contextKey,
    difficulty,
    wasExploration,
    estimatedReward,
    reason,
    createdAt: new Date().toISOString()
  };
  await db.adaptiveDecisions.add(decision);
  
  return {
    selectedDifficulty: difficulty,
    reason,
    isExploration: wasExploration
  };
}

function _getBoundedRandomDifficulty(current: DifficultyLevel): DifficultyLevel {
  const diffs: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];
  const currentIndex = diffs.indexOf(current);
  
  const choices: DifficultyLevel[] = [current];
  if (currentIndex > 0) choices.push(diffs[currentIndex - 1]);
  if (currentIndex < 2) choices.push(diffs[currentIndex + 1]);
  
  const randIndex = Math.floor(Math.random() * choices.length);
  return choices[randIndex];
}

function _boundDifficulty(current: DifficultyLevel, target: DifficultyLevel): DifficultyLevel {
  const diffs: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];
  const currentIndex = diffs.indexOf(current);
  const targetIndex = diffs.indexOf(target);
  
  if (Math.abs(currentIndex - targetIndex) <= 1) return target;
  
  // Bound to max 1 step
  if (targetIndex > currentIndex) return diffs[currentIndex + 1];
  return diffs[currentIndex - 1];
}

export async function updateAdaptivePolicy(record: PerformanceRecord, contextKey: string): Promise<void> {
  const reward = calculateReward(record);
  const difficulty = (record.difficulty as DifficultyLevel) || 'MEDIUM';
  
  const existing = await db.adaptiveArmStates
    .where('[elderId+gameId+difficulty]')
    .equals([record.elderId, record.gameId, difficulty])
    .filter(a => a.contextKey === contextKey)
    .first();

  if (existing) {
    const newCount = existing.selectionCount + 1;
    // Online mean variance calculation
    const delta = reward - existing.meanReward;
    const newMean = existing.meanReward + delta / newCount;
    // Simple variance estimation approximation
    const newVariance = ((existing.selectionCount * existing.rewardVariance) + delta * (reward - newMean)) / newCount;
    
    await db.adaptiveArmStates.update(existing.id, {
      selectionCount: newCount,
      meanReward: newMean,
      rewardVariance: newVariance,
      updatedAt: new Date().toISOString(),
      lastSelectedAt: new Date().toISOString()
    });
  } else {
    await db.adaptiveArmStates.add({
      id: crypto.randomUUID(),
      elderId: record.elderId,
      gameId: record.gameId,
      difficulty,
      contextKey,
      selectionCount: 1,
      meanReward: reward,
      rewardVariance: 0,
      updatedAt: new Date().toISOString(),
      lastSelectedAt: new Date().toISOString()
    });
  }
}

export async function rebuildAdaptiveState(elderId: string): Promise<void> {
  // Clear existing stats for this elder
  await db.adaptiveArmStates.where('elderId').equals(elderId).delete();
  
  // Note: we don't clear decisions as they are historical logs. 
  // However, for total correctness, rebuild relies on chronological PerformanceRecords.
  
  const records = await db.performanceRecords
    .where('elderId').equals(elderId)
    .sortBy('createdAt');
    
  // Rebuild
  // We need to pass the context bucket at the time of the record, 
  // which means looking at the records BEFORE it.
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    // Recent records = previous 5
    const recentSlice = records.slice(Math.max(0, i - 5), i).reverse(); // Reverse to have most recent first
    const lastDiff = i > 0 ? records[i-1].difficulty : undefined;
    
    const contextKey = calculateContextKey(recentSlice, lastDiff);
    await updateAdaptivePolicy(record, contextKey);
  }
}
