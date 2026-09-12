import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { calculateContextKey, calculateReward, selectDifficulty, updateAdaptivePolicy, rebuildAdaptiveState } from './adaptiveEngine';
import { db } from '../../db';

describe('Adaptive Engine (Phase 6)', () => {
  beforeEach(async () => {
    await db.performanceRecords.clear();
    await db.adaptiveArmStates.clear();
    await db.adaptiveDecisions.clear();
  });

  describe('calculateContextKey', () => {
    it('returns MODERATE_MEDIUM_MEDIUM for empty records', () => {
      expect(calculateContextKey([])).toBe('MODERATE_MEDIUM_MEDIUM');
    });

    it('determines STRONG_HIGH context', () => {
      const records = [
        { status: 'COMPLETED', accuracy: 0.9, difficulty: 'HARD' },
        { status: 'COMPLETED', accuracy: 1.0, difficulty: 'HARD' }
      ] as any[];
      expect(calculateContextKey(records, 'HARD')).toBe('STRONG_HIGH_HARD');
    });

    it('determines WEAK_LOW context', () => {
      const records = [
        { status: 'COMPLETED', accuracy: 0.2 },
        { status: 'ABANDONED',  },
        { status: 'ABANDONED',  }
      ] as any[];
      expect(calculateContextKey(records, 'EASY')).toBe('WEAK_LOW_EASY');
    });
  });

  describe('calculateReward', () => {
    it('gives -1 for abandoned', () => {
      expect(calculateReward({ status: 'ABANDONED',  } as any)).toBe(-1.0);
    });

    it('calculates proportional positive reward for accuracy', () => {
      // Base 0.5 + (0.5 * 2 - 1)*0.4 = 0.5 + 0 = 0.5 (moderate/neutral)
      expect(calculateReward({ status: 'COMPLETED', accuracy: 0.5 } as any)).toBe(0.5);
      
      // Base 0.5 + (1.0 * 2 - 1)*0.4 = 0.5 + 0.4 = 0.9 (strongly positive)
      expect(calculateReward({ status: 'COMPLETED', accuracy: 1.0 } as any)).toBe(0.9);
      
      // Base 0.5 + (0.0 * 2 - 1)*0.4 = 0.5 - 0.4 = 0.1 (negative/poor accuracy contribution)
      expect(calculateReward({ status: 'COMPLETED', accuracy: 0.0 } as any)).toBeCloseTo(0.1);
      
      // Error penalty
      expect(calculateReward({ status: 'COMPLETED', accuracy: 1.0, incorrect: 4 } as any)).toBeCloseTo(0.6); // 0.9 - 0.3
    });
  });

  describe('selectDifficulty', () => {
    const mockElder = 'elder1';
    const mockGame = 'game1';

    it('defaults to MEDIUM with no history', async () => {
      const decision = await selectDifficulty(mockElder, mockGame, []);
      expect(decision.selectedDifficulty).toBe('MEDIUM');
      expect(decision.isExploration).toBe(true);
      expect(decision.reason).toContain('No historical data');
    });

    it('exploits best known arm when context has history', async () => {
      await db.adaptiveArmStates.bulkAdd([
        { id: '1', elderId: mockElder, gameId: mockGame, contextKey: 'STRONG_HIGH_MEDIUM', difficulty: 'EASY', meanReward: 0.1, selectionCount: 50, rewardVariance: 0, lastSelectedAt: '', updatedAt: '' },
        { id: '2', elderId: mockElder, gameId: mockGame, contextKey: 'STRONG_HIGH_MEDIUM', difficulty: 'HARD', meanReward: 0.8, selectionCount: 50, rewardVariance: 0, lastSelectedAt: '', updatedAt: '' }
      ]);
      
      const records = [{ status: 'COMPLETED', accuracy: 1.0, difficulty: 'MEDIUM' }] as any[];
      // The context will be STRONG_HIGH_MEDIUM. Epsilon will be min (0.05).
      
      // Since it's random, we might hit exploration 5% of the time. But 95% of the time, we hit HARD.
      // We can force Math.random to avoid flakes
      vi.spyOn(Math, 'random').mockReturnValue(0.99); 
      
      const decision = await selectDifficulty(mockElder, mockGame, records);
      expect(decision.selectedDifficulty).toBe('HARD');
      expect(decision.isExploration).toBe(false);
      expect(decision.reason).toContain('Exploiting highest contextual reward');
      
      vi.restoreAllMocks();
    });

    it('bounds difficulty jumps', async () => {
      await db.adaptiveArmStates.bulkAdd([
        { id: '3', elderId: mockElder, gameId: mockGame, contextKey: 'MODERATE_HIGH_EASY', difficulty: 'HARD', meanReward: 0.9, selectionCount: 50, rewardVariance: 0, lastSelectedAt: '', updatedAt: '' }
      ]);
      
      const records = [{ status: 'COMPLETED', accuracy: 0.6, difficulty: 'EASY' }] as any[];
      vi.spyOn(Math, 'random').mockReturnValue(0.99); 
      
      const decision = await selectDifficulty(mockElder, mockGame, records);
      // Even though HARD is best, current is EASY, so it should jump max 1 step to MEDIUM
      expect(decision.selectedDifficulty).toBe('MEDIUM');
      expect(decision.reason).toContain('bounded by safety rules');
      
      vi.restoreAllMocks();
    });
  });

  describe('updateAdaptivePolicy & rebuildAdaptiveState', () => {
    it('accumulates mean rewards properly', async () => {
      const record1 = { elderId: 'e1', gameId: 'g1', status: 'COMPLETED', accuracy: 1.0, difficulty: 'HARD' } as any;
      await updateAdaptivePolicy(record1, 'STRONG_HIGH_HARD');
      
      let state = await db.adaptiveArmStates.toCollection().first();
      expect(state?.meanReward).toBe(0.9);
      expect(state?.selectionCount).toBe(1);

      const record2 = { elderId: 'e1', gameId: 'g1', status: 'COMPLETED', accuracy: 0.5, difficulty: 'HARD' } as any; // reward = 0.5
      await updateAdaptivePolicy(record2, 'STRONG_HIGH_HARD');
      
      state = await db.adaptiveArmStates.toCollection().first();
      expect(state?.meanReward).toBe(0.7); // (0.9 + 0.5) / 2
      expect(state?.selectionCount).toBe(2);
    });

    it('rebuilds state from empty', async () => {
      // 1. Create PerformanceRecords
      const p1 = { id: 'p1', elderId: 'e2', gameId: 'g1', createdAt: '2026-01-01', status: 'COMPLETED', accuracy: 0.5, difficulty: 'EASY' } as any;
      const p2 = { id: 'p2', elderId: 'e2', gameId: 'g1', createdAt: '2026-01-02', status: 'COMPLETED', accuracy: 1.0, difficulty: 'HARD' } as any;
      
      await db.performanceRecords.bulkAdd([p1, p2]);

      // 2. update adaptive state manually
      await updateAdaptivePolicy(p1, 'MODERATE_MEDIUM_MEDIUM');
      await updateAdaptivePolicy(p2, 'MODERATE_HIGH_EASY'); // simulated context for p2
      
      const beforeStates = await db.adaptiveArmStates.toArray();

      // 3. clear adaptiveArmStates
      await db.adaptiveArmStates.clear();
      
      // 4. rebuild
      await rebuildAdaptiveState('e2');
      
      // 5. compare resulting arm statistics
      const afterStates = await db.adaptiveArmStates.toArray();
      
      expect(afterStates.length).toBe(beforeStates.length);
      
      // Ensure the stats match precisely
      beforeStates.forEach(b => {
        const a = afterStates.find(x => x.contextKey === b.contextKey && x.difficulty === b.difficulty);
        expect(a).toBeDefined();
        expect(a!.meanReward).toBeCloseTo(b.meanReward);
        expect(a!.selectionCount).toBe(b.selectionCount);
      });
    });
  });
});
