import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { evaluateChangeSignals } from './engine';
import type { PerformanceRecord } from '../personalization/types';

describe('Cognitive Change Radar Engine', () => {
  beforeEach(async () => {
    await db.performanceRecords.clear();
    await db.cognitiveBaselines.clear();
    await db.changeSignals.clear();
  });

  const setupBaseline = async (category: string, mean: number) => {
    await db.cognitiveBaselines.put({
      id: `elder_test_${category}`, elderId: 'elder_test', category: category as any, mean, variance: 0.01, sampleCount: 10, lastUpdatedAt: new Date().toISOString(), sourceGameIds: ['test-game']
    });
  };

  const addPerformance = async (category: string, gameId: string, values: number[]) => {
    let idCounter = 0;
    for (const val of values) {
      await db.performanceRecords.add({
        id: `perf_${category}_${idCounter++}_${Date.now()}_${Math.random()}`,
        sessionId: `sess_${idCounter}`,
        elderId: 'elder_test',
        gameId,
        status: (category === 'Engagement' && val === 0) ? 'ABANDONED' : 'COMPLETED',
        accuracy: category !== 'Reaction' && category !== 'Engagement' ? val : 0,
        avgReactionTimeMs: category === 'Reaction' ? val : 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      } as unknown as PerformanceRecord);
    }
  };

  it('assigns INSUFFICIENT_DATA if minimum total sessions (baseline) are not met', async () => {
    const signals = await evaluateChangeSignals('elder_test');
    expect(signals).toHaveLength(5);
    signals.forEach(s => {
      expect(s.status).toBe('INSUFFICIENT_DATA');
      expect(s.severity).toBe('NONE');
    });
  });

  it('assigns INSUFFICIENT_DATA if recent sessions < MIN_RECENT_SESSIONS', async () => {
    await setupBaseline('Reaction', 1000);
    // Add only 2 recent records
    await addPerformance('Reaction', 'test-game', [1000, 1050]);
    
    const signals = await evaluateChangeSignals('elder_test');
    const reaction = signals.find(s => s.category === 'Reaction');
    expect(reaction?.status).toBe('INSUFFICIENT_DATA');
    expect(reaction?.severity).toBe('NONE');
    expect(reaction?.explanation).toBe('Building personal history...');
  });

  it('detects a stable signal (normal variation)', async () => {
    await setupBaseline('Memory', 0.8);
    await addPerformance('Memory', 'object-recognition', [0.8, 0.75, 0.85, 0.8, 0.7]);
    
    const signals = await evaluateChangeSignals('elder_test');
    const memory = signals.find(s => s.category === 'Memory');
    
    expect(memory?.status).toBe('RESOLVED'); // Stable
    expect(memory?.direction).toBe('STABLE');
    expect(memory?.severity).toBe('NONE');
    expect(memory?.persistenceCount).toBe(0);
  });

  it('detects a WATCH candidate signal for 1-2 negative deviations', async () => {
    await setupBaseline('Memory', 0.8);
    // 0.60 and 0.55 are > 0.15 drop. That's 2 deviations.
    await addPerformance('Memory', 'object-recognition', [0.8, 0.75, 0.8, 0.60, 0.55]);
    
    const signals = await evaluateChangeSignals('elder_test');
    const memory = signals.find(s => s.category === 'Memory');
    
    expect(memory?.status).toBe('ACTIVE');
    expect(memory?.direction).toBe('DECLINING');
    expect(memory?.severity).toBe('WATCH');
    expect(memory?.persistenceCount).toBe(2);
  });

  it('detects a PERSISTENT CHANGE for 3+ negative deviations', async () => {
    await setupBaseline('Memory', 0.8);
    // 3 deviations
    await addPerformance('Memory', 'object-recognition', [0.8, 0.75, 0.62, 0.60, 0.55]);
    
    const signals = await evaluateChangeSignals('elder_test');
    const memory = signals.find(s => s.category === 'Memory');
    
    expect(memory?.status).toBe('ACTIVE');
    expect(memory?.direction).toBe('DECLINING');
    expect(memory?.severity).toBe('PERSISTENT');
    expect(memory?.persistenceCount).toBe(3);
  });

  it('properly evaluates reaction time where higher is worse', async () => {
    await setupBaseline('Reaction', 1000); 
    // Threshold is 300ms increase.
    await addPerformance('Reaction', 'test-game', [1000, 1050, 1400, 1350, 1500]); // 3 deviations
    
    const signals = await evaluateChangeSignals('elder_test');
    const reaction = signals.find(s => s.category === 'Reaction');
    
    expect(reaction?.status).toBe('ACTIVE');
    expect(reaction?.direction).toBe('DECLINING');
    expect(reaction?.severity).toBe('PERSISTENT');
    expect(reaction?.persistenceCount).toBe(3);
  });

  it('properly evaluates engagement persistence counting individually', async () => {
    await setupBaseline('Engagement', 0.9); // baseline 90% completion
    // Threshold is 20% drop, so completion <= 0.7 means a single session (0) is a deviation.
    // 3 abandoned sessions
    await addPerformance('Engagement', 'test-game', [1, 1, 0, 0, 0]); 
    
    const signals = await evaluateChangeSignals('elder_test');
    const engagement = signals.find(s => s.category === 'Engagement');
    
    expect(engagement?.status).toBe('ACTIVE');
    expect(engagement?.direction).toBe('DECLINING');
    expect(engagement?.severity).toBe('PERSISTENT');
    expect(engagement?.persistenceCount).toBe(3);
  });

  it('resolves an active signal if performance recovers', async () => {
    await setupBaseline('Memory', 0.8);
    await db.changeSignals.put({
      id: 'elder_test_Memory', elderId: 'elder_test', category: 'Memory',
      metric: 'accuracy', baselineValue: 0.8, currentValue: 0.5, delta: -0.3,
      direction: 'DECLINING', severity: 'PERSISTENT', persistenceCount: 5, sampleCount: 5,
      lastObservedAt: new Date().toISOString(), status: 'ACTIVE', explanation: 'Test'
    });

    await addPerformance('Memory', 'object-recognition', [0.75, 0.8, 0.85, 0.8, 0.75]);
    
    const signals = await evaluateChangeSignals('elder_test');
    const memory = signals.find(s => s.category === 'Memory');
    
    expect(memory?.status).toBe('RESOLVED');
    expect(memory?.severity).toBe('NONE');
    expect(memory?.persistenceCount).toBe(0);
  });

  it('preserves elder isolation', async () => {
    await db.cognitiveBaselines.put({
      id: 'elder_B_Memory', elderId: 'elder_B', category: 'Memory', mean: 0.9, variance: 0, sampleCount: 10, lastUpdatedAt: new Date().toISOString(), sourceGameIds: []
    });
    for (let i = 0; i < 5; i++) {
      await db.performanceRecords.add({
        id: `perf_B_${i}`, sessionId: `sess_B_${i}`, elderId: 'elder_B', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.2, startedAt: new Date().toISOString(), completedAt: new Date().toISOString()
      } as unknown as PerformanceRecord);
    }

    const signals = await evaluateChangeSignals('elder_A');
    const memoryA = signals.find(s => s.category === 'Memory');
    expect(memoryA?.status).toBe('INSUFFICIENT_DATA');
  });
});
