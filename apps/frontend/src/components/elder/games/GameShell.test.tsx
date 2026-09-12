import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameShell } from './GameShell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def: string) => def })
}));

describe('GameShell Component', () => {
  it('renders correctly with slots', () => {
    const handleExit = vi.fn();
    render(
      <GameShell
        title="Test Game"
        instruction="Instruction slot"
        audioControl={<button aria-label="Audio">Audio</button>}
        progress={<div role="progressbar">Progress</div>}
        feedback="Feedback slot"
        onExit={handleExit}
      >
        <div data-testid="main-content">Content</div>
      </GameShell>
    );

    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('Instruction slot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audio' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Feedback slot')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('calls onExit when exit button is clicked', () => {
    const handleExit = vi.fn();
    render(
      <GameShell onExit={handleExit}>
        <div>Content</div>
      </GameShell>
    );

    const exitBtn = screen.getByText('Exit Game');
    fireEvent.click(exitBtn);
    expect(handleExit).toHaveBeenCalled();
  });
});
