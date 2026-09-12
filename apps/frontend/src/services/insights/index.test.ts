import { describe, it, expect, vi } from 'vitest';
import { generateCaregiverInsights } from './index';
import type { PerformanceRecord } from '../personalization/types';

vi.mock('i18next', () => ({
  t: (key: string, defaultText: string) => defaultText
}));

describe('generateCaregiverInsights', () => {
  it('returns none if no sessions', () => {
    expect(generateCaregiverInsights([], null)).toContain('analyze');
  });

  it('handles all abandoned', () => {
    const sessions = [{ status: 'ABANDONED', gameId: 'g1' } as PerformanceRecord];
    expect(generateCaregiverInsights(sessions, null)).toContain('abandoned');
  });

  it('generates strong performance insight', () => {
    const sessions = [{ status: 'COMPLETED', gameId: 'recall', accuracy: 0.9 } as PerformanceRecord];
    expect(generateCaregiverInsights(sessions, null)).toContain('stronger');
  });
});
