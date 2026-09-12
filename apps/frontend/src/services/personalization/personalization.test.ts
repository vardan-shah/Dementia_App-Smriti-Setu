import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { normalizePerformance } from './normalization';
import { computeBaselines } from './baseline';
import { recommendNextActivity } from './recommendation';
import { getCognitiveProfile } from './profile';
import { PerformanceRecord } from './types';

describe('Personalization Engine', () => {
  beforeEach(async () => {
    await db.sessions.clear();
    await db.cognitiveBaselines.clear();
  });

  it('normalizes session to PerformanceRecord', () => {
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

  it('computes baselines properly with insufficient data fallback', async () => {
    // 1 session -> insufficient data for Memory (MIN_BASELINE_SESSIONS = 3)
    await db.sessions.add({
      id: 's1', gameId: 'object-recognition', elderId: 'elder_1', status: 'COMPLETED', startedAt: new Date().toISOString(),
      metrics: { accuracy: 0.8, avgReactionTimeMs: 1000 }
    } as any);

    const baselines1 = await computeBaselines('elder_1');
    expect(baselines1).toHaveLength(0); // Not enough for any category

    // Add 2 more memory sessions
    await db.sessions.add({
      id: 's2', gameId: 'recall', elderId: 'elder_1', status: 'COMPLETED', startedAt: new Date().toISOString(),
      metrics: { accuracy: 0.9, avgReactionTimeMs: 1200 }
    } as any);
    await db.sessions.add({
      id: 's3', gameId: 'object-recognition', elderId: 'elder_1', status: 'COMPLETED', startedAt: new Date().toISOString(),
      metrics: { accuracy: 0.7, avgReactionTimeMs: 1400 }
    } as any);

    const baselines2 = await computeBaselines('elder_1');
    
    // Engagement, Reaction, Memory should all have >=3 now
    expect(baselines2.length).toBeGreaterThanOrEqual(3);
    
    const memoryB = baselines2.find(b => b.category === 'Memory');
    expect(memoryB).toBeDefined();
    expect(memoryB?.sampleCount).toBe(3);
    expect(memoryB?.mean).toBeCloseTo(0.8); // (0.8+0.9+0.7)/3
  });

  it('generates non-clinical cognitive profile', async () => {
    await db.sessions.add({
      id: 's1', gameId: 'language-exercises', elderId: 'elder_1', status: 'COMPLETED', startedAt: new Date().toISOString(),
      metrics: { accuracy: 0.9 }
    } as any);

    const profile = await getCognitiveProfile('elder_1');
    
    // 1 session for Language -> BUILDING_BASELINE
    const langScore = profile.scores.find(s => s.category === 'Language');
    expect(langScore?.confidence).toBe('BUILDING_BASELINE');
    
    // 0 sessions for Attention -> INSUFFICIENT_DATA
    const attnScore = profile.scores.find(s => s.category === 'Attention');
    expect(attnScore?.confidence).toBe('INSUFFICIENT_DATA');
  });

  it('recommendNextActivity factors recency and performance', async () => {
    // Elder played object-recognition 10 times and did well
    for(let i=0; i<10; i++) {
      await db.sessions.add({
        id: `s${i}`, gameId: 'object-recognition', elderId: 'elder_rec', status: 'COMPLETED', startedAt: new Date().toISOString(),
        metrics: { correct: 10, errors: 0 }
      } as any);
    }
    
    const rec = await recommendNextActivity('elder_rec');
    // It should recommend a DIFFERENT game because object-recognition was just played 10 times in a row
    expect(rec.gameId).not.toBe('object-recognition');
  });
});
