import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Recall } from './Recall';
import { MemoryRouter } from 'react-router-dom';
import * as dbModule from '../../../db';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def: string) => def })
}));

vi.mock('../../../db', () => {
  const toArrayMock = vi.fn();
  const equalsMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
  const whereMock = vi.fn().mockReturnValue({ equals: equalsMock });
  return {
    db: {
      relatives: { where: whereMock, toArray: toArrayMock },
      memories: { where: whereMock, toArray: toArrayMock },
      sessions: { add: vi.fn() },
      syncEvents: { add: vi.fn() }
    }
  };
});

vi.mock('../../../services/adaptiveDifficulty', () => ({
  getRecommendedDifficulty: vi.fn().mockResolvedValue('EASY'),
  getDifficultyConfig: vi.fn().mockReturnValue({ studyItems: 2, candidateSetSize: 4 })
}));

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ elderId: 'test-elder-123' }))
}));

describe('Recall Game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbModule.db.relatives.toArray as any).mockResolvedValue([]);
    (dbModule.db.memories.toArray as any).mockResolvedValue([]);
  });

  it('renders study phase, progresses to recall phase, and handles completion', async () => {
    render(
      <MemoryRouter>
        <Recall />
      </MemoryRouter>
    );

    // Wait for study phase
    await waitFor(() => {
      expect(screen.getByText("Look carefully at these items:")).toBeInTheDocument();
    });

    // Check that we have items
    const readyBtn = screen.getByText("I'm ready");
    fireEvent.click(readyBtn);

    // Should progress to RECALL phase
    await waitFor(() => {
      expect(screen.getByText("Which items did you see?")).toBeInTheDocument();
    });

    // Click the first two candidates (since EASY difficulty config says studyItems: 2, selecting any 2 items allows submit)
    // Actually we don't know which ones are correct without looking at DOM, but we can just click the first two buttons to enable submit.
    const candidateButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Submit' && b.textContent !== 'Exit Game');
    expect(candidateButtons.length).toBeGreaterThanOrEqual(2);
    
    fireEvent.click(candidateButtons[0]);
    fireEvent.click(candidateButtons[1]);

    const submitBtn = screen.getByText("Submit");
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Progresses to RESULT
    await waitFor(() => {
      expect(screen.getByText('Great job!')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText("Look carefully at these items:")).toBeInTheDocument();
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
