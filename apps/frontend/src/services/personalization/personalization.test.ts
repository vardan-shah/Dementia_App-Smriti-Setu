import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { normalizePerformance } from './normalization';
import { computeBaselines } from './baseline';
import { recommendNextActivity } from './recommendation';
import { getCognitiveProfile } from './profile';
import type { PerformanceRecord } from './types';

describe('Personalization Engine Core', () => {
  beforeEach(async () => {
    await db.sessions.clear();
    await db.performanceRecords.clear();
    await db.cognitiveBaselines.clear();
  });

  it('normalizes session to PerformanceRecord and correctly handles missing metrics', () => {
    const session = {
      id: 'sess_1',
      elderId: 'elder_1',
      gameId: 'object-recognition',
      status: 'COMPLETED',
      startedAt: '2026-09-12T10:00:00Z',
      completedAt: '2026-09-12T10:05:00Z',
      metrics: {
        accuracy: 0.8,
        errorRate: 0.2,
        correct: 8,
        errors: 2,
        attempts: 10,
        avgReactionTimeMs: 1200,
        gameSpecificMetrics: {
          difficulty: 'HARD',
          optionsPresented: 30
        }
      }
    };

    const record: PerformanceRecord = normalizePerformance(session);
    
    expect(record.sessionId).toBe('sess_1');
    expect(record.difficulty).toBe('HARD');
    expect(record.accuracy).toBe(0.8);
    expect(record.incorrect).toBe(2);
    expect(record.avgReactionTimeMs).toBe(1200);
    expect(record.gameSpecificMetrics.optionsPresented).toBe(30);
  });

  it('migrates legacy sessions and computes baselines properly with insufficient data fallback', async () => {
    // 1 legacy session (no performanceRecord yet)
    await db.sessions.add({
      id: 's1', gameId: 'object-recognition', elderId: 'elder_1', status: 'COMPLETED', startedAt: new Date().toISOString(),
      metrics: { accuracy: 0.8, avgReactionTimeMs: 1000 }
    } as any);

    // computeBaselines should trigger migration
    const baselines1 = await computeBaselines('elder_1');
    expect(baselines1).toHaveLength(0); // Not enough for any category

    const records1 = await db.performanceRecords.toArray();
    expect(records1).toHaveLength(1); // Migrated!

    // Add 2 more performance records manually
    await db.performanceRecords.bulkPut([
      { id: 's2_perf', sessionId: 's2', elderId: 'elder_1', gameId: 'recall', status: 'COMPLETED', accuracy: 0.9, avgReactionTimeMs: 1200 } as any,
      { id: 's3_perf', sessionId: 's3', elderId: 'elder_1', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.7, avgReactionTimeMs: 1400 } as any
    ]);

    const baselines2 = await computeBaselines('elder_1');
    
    expect(baselines2.length).toBeGreaterThanOrEqual(3); // Engagement, Reaction, Memory
    
    const memoryB = baselines2.find(b => b.category === 'Memory');
    expect(memoryB).toBeDefined();
    expect(memoryB?.sampleCount).toBe(3);
    expect(memoryB?.mean).toBeCloseTo(0.8); // (0.8+0.9+0.7)/3
  });

  it('generates non-clinical cognitive profile with proper reaction metrics and NOT_YET_MEASURED for Attention', async () => {
    // Add baseline for language
    await db.cognitiveBaselines.put({
      id: 'elder_1_Language', elderId: 'elder_1', category: 'Language', mean: 0.9, variance: 0.01, sampleCount: 5, lastUpdatedAt: new Date().toISOString(), sourceGameIds: ['language-exercises']
    });

    await db.performanceRecords.add({
      id: 's1', sessionId: 's1', gameId: 'language-exercises', elderId: 'elder_1', status: 'COMPLETED', 
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      accuracy: 0.9, avgReactionTimeMs: 0
    } as any);

    const profile = await getCognitiveProfile('elder_1');
    
    const langScore = profile.scores.find(s => s.category === 'Language');
    expect(langScore?.confidence).toBe('BUILDING_BASELINE'); // Only 1 record in performanceRecords
    expect(langScore?.score).toBe(90);
    
    const attnScore = profile.scores.find(s => s.category === 'Attention');
    expect(attnScore?.confidence).toBe('NOT_YET_MEASURED'); // Hardcoded properly
    expect(attnScore?.score).toBeUndefined();
  });

  it('recommendNextActivity factors recency, performance, and diversity', async () => {
    // Elder played object-recognition 10 times
    for(let i=0; i<10; i++) {
      await db.performanceRecords.add({
        id: `perf_${i}`, sessionId: `s${i}`, gameId: 'object-recognition', elderId: 'elder_rec', status: 'COMPLETED', 
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        accuracy: 1.0, errors: 0
      } as any);
    }
    
    const rec = await recommendNextActivity('elder_rec');
    
    // Recency penalty and diversity penalty should make it recommend a different game
    expect(rec.gameId).not.toBe('object-recognition');
    expect(['recall', 'language-exercises']).toContain(rec.gameId);
  });
  
  it('enforces strict elder isolation (Elder A cannot affect Elder B)', async () => {
    await db.performanceRecords.bulkPut([
      { id: 'perf_A1', sessionId: 'sA1', elderId: 'elder_A', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.9 } as any,
      { id: 'perf_A2', sessionId: 'sA2', elderId: 'elder_A', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.9 } as any,
      { id: 'perf_A3', sessionId: 'sA3', elderId: 'elder_A', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.9 } as any,
      
      { id: 'perf_B1', sessionId: 'sB1', elderId: 'elder_B', gameId: 'object-recognition', status: 'COMPLETED', accuracy: 0.1 } as any
    ]);

    await computeBaselines('elder_A');
    await computeBaselines('elder_B');

    const profileA = await getCognitiveProfile('elder_A');
    const profileB = await getCognitiveProfile('elder_B');

    const memA = profileA.scores.find(s => s.category === 'Memory');
    const memB = profileB.scores.find(s => s.category === 'Memory');

    expect(memA?.confidence).toBe('STABLE_BASELINE');
    expect(memB?.confidence).toBe('BUILDING_BASELINE'); // Only 1 record for B
  });
});
