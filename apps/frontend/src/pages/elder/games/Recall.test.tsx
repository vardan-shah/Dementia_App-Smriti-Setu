const mockT = vi.fn((key: string, def: string) => def);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Recall } from './Recall';
import { MemoryRouter } from 'react-router-dom';
import * as dbModule from '../../../db';

vi.mock('react-i18next', () => {
  return { useTranslation: () => ({ t: mockT }) };
});

vi.mock('../../../db', () => {
  const toArrayMock = vi.fn().mockResolvedValue([]);
  const equalsMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
  const whereMock = vi.fn().mockReturnValue({ equals: equalsMock });
  return {
    db: {
      relatives: { where: whereMock, toArray: toArrayMock },
      memories: { where: whereMock, toArray: toArrayMock },
      sessions: { add: vi.fn() },
    performanceRecords: { add: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ filter: vi.fn(() => ({ reverse: vi.fn(() => ({ limit: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })) })) })) })) },
    adaptiveArmStates: { add: vi.fn(), update: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ filter: vi.fn(() => ({ first: vi.fn().mockResolvedValue(null) })) })) })) },
    adaptiveDecisions: { add: vi.fn() }, transaction: vi.fn(async (mode, ...args) => { const cb = args.pop(); return cb(); }),
      syncEvents: { add: vi.fn() }
    }
  };
});

vi.mock('../../../services/adaptiveDifficulty', () => ({
  getRecommendedDifficulty: vi.fn().mockResolvedValue('EASY'),
  getDifficultyConfig: vi.fn().mockReturnValue({ studyItems: 2, candidateSetSize: 4, studyDurationMs: 0 })
}));

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ elderId: 'test-elder-123' }))
}));

describe('Recall Game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders study phase, progresses to recall phase, and handles completion', async () => {
    render(
      <MemoryRouter>
        <Recall />
      </MemoryRouter>
    );

    // Should progress to RECALL phase because studyDurationMs is 0
    await waitFor(() => {
      expect(screen.getByText("Which items did you see?")).toBeInTheDocument();
    });

    const candidateButtons = screen.getAllByRole('button').filter(b => 
      b.textContent !== 'Submit' && 
      b.textContent !== 'Exit Game' &&
      b.getAttribute('aria-label') !== 'Play Instruction'
    );
    expect(candidateButtons.length).toBeGreaterThanOrEqual(2);
    
    fireEvent.click(candidateButtons[0]);
    fireEvent.click(candidateButtons[1]);

    const submitBtn = screen.getByText("Submit");
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Progresses to RESULT
    await waitFor(() => {
      expect(screen.getByText(/You remembered/i)).toBeInTheDocument();
    });

    const finishBtn = screen.getByText('Finish');
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(dbModule.db.sessions.add).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'recall', status: 'COMPLETED' })
      );
    });
  });

  it('handles abandonment', async () => {
    render(
      <MemoryRouter>
        <Recall />
      </MemoryRouter>
    );

    // Should immediately show recall phase
    await waitFor(() => {
      expect(screen.getByText("Which items did you see?")).toBeInTheDocument();
    });

    const exitBtn = screen.getByText('Exit Game');
    fireEvent.click(exitBtn);

    await waitFor(() => {
      expect(dbModule.db.sessions.add).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'recall', status: 'ABANDONED' })
      );
    });
  });
});
