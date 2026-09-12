import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface GameShellProps {
  title?: string;
  instruction?: React.ReactNode;
  audioControl?: React.ReactNode;
  progress?: React.ReactNode;
  feedback?: React.ReactNode;
  
  loading?: boolean;
  emptyState?: boolean;
  emptyStateMessage?: string;
  onExit: () => void;
  children: React.ReactNode;
}

export function GameShell({
  title,
  instruction,
  audioControl,
  progress,
  feedback,
  loading = false,
  emptyState = false,
  emptyStateMessage,
  onExit,
  children
}: GameShellProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="text-2xl text-center mt-20" aria-live="polite">{t('loading_game', 'Loading game...')}</div>;
  }

  if (emptyState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        {title && <h2 className="text-3xl font-bold mb-4">{title}</h2>}
        <Card className="p-8 max-w-lg bg-orange-50 border-orange-200">
          <p className="text-2xl mb-4">
            {emptyStateMessage || t('ask_family_add_first', 'Ask a family member to add someone first.')}
          </p>
          <Button onClick={onExit} className="w-full text-xl py-4 min-h-[64px]">{t('return_home', 'Return Home')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[70vh] p-4 max-w-2xl mx-auto w-full">
      {/* Header Slot */}
      <div className="w-full flex flex-col items-center mb-6 text-center space-y-4">
        {title && <h2 className="text-4xl font-bold">{title}</h2>}
        
        <div className="flex items-center justify-center space-x-4 w-full">
          {instruction && <div className="text-2xl font-medium">{instruction}</div>}
          {audioControl && <div>{audioControl}</div>}
        </div>

        {progress && <div className="w-full max-w-md mt-4">{progress}</div>}
      </div>
      
      {/* Main Content Slot */}
      <div className="flex flex-col items-center w-full flex-grow">
        {children}
      </div>

      {/* Feedback Slot */}
      {feedback && (
        <div className="mt-8 w-full text-center" aria-live="polite">
          {feedback}
        </div>
      )}

      {/* Footer Slot */}
      <div className="mt-12 mb-8">
        <Button variant="outline" onClick={onExit} className="text-xl px-8 py-4 min-h-[64px]">
          {t('exit_game', 'Exit Game')}
        </Button>
      </div>
    </div>
  );
}
