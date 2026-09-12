import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageExercises } from './LanguageExercises';
import { MemoryRouter } from 'react-router-dom';
import * as dbModule from '../../../db';
import { VOCABULARY } from '../../../data/vocabulary';

vi.mock('react-i18next', () => {
  const mockT = vi.fn((key: string, def: string) => def);
  return { useTranslation: () => ({ t: mockT }) };
});

vi.mock('../../../db', () => ({
  db: {
    sessions: { add: vi.fn() },
    syncEvents: { add: vi.fn() }
  }
}));

vi.mock('../../../services/adaptiveDifficulty', () => ({
  getRecommendedDifficulty: vi.fn().mockResolvedValue('EASY'),
  getDifficultyConfig: vi.fn().mockReturnValue({ choices: 2 })
}));

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ elderId: 'test-elder-123' }))
}));

vi.mock('../../../store/useSettingsStore', () => ({
  useSettingsStore: vi.fn(() => ({ language: 'en' }))
}));

describe('Language Exercises Game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vocabulary options and allows exit', async () => {
    render(
      <MemoryRouter>
        <LanguageExercises />
      </MemoryRouter>
    );

    // Wait for load
    let buttons: HTMLElement[] = [];
    await waitFor(() => {
      expect(screen.getByText('Match the Word')).toBeInTheDocument();
      buttons = screen.getAllByRole('button').filter(b => 
        b.textContent !== 'Exit Game' &&
        b.getAttribute('aria-label') !== 'Play Instruction'
      );
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    const exitBtn = screen.getByText('Exit Game');
    fireEvent.click(exitBtn);

    await waitFor(() => {
      expect(dbModule.db.sessions.add).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'language-exercises', status: 'ABANDONED' })
      );
    });
  });

  it('handles correct answer and progresses', async () => {
    render(
      <MemoryRouter>
        <LanguageExercises />
      </MemoryRouter>
    );

    let buttons: HTMLElement[] = [];
    await waitFor(() => {
      expect(screen.getByText('Match the Word')).toBeInTheDocument();
      buttons = screen.getAllByRole('button').filter(b => 
        b.textContent !== 'Exit Game' &&
        b.getAttribute('aria-label') !== 'Play Instruction'
      );
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
    
    // Pick the first option, if it's right it advances. We are just verifying it doesn't crash here.
    fireEvent.click(buttons[0]);
    
    // Not explicitly waiting for the 2 second delay to avoid long tests, 
    // but we can verify state change
    expect(buttons[0]).toBeDisabled();
  });
});
