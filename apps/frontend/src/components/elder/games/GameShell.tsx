import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface GameShellProps {
  title: string;
  loading?: boolean;
  emptyState?: boolean;
  emptyStateMessage?: string;
  onExit: () => void;
  children: React.ReactNode;
}

export function GameShell({
  title,
  loading = false,
  emptyState = false,
  emptyStateMessage,
  onExit,
  children
}: GameShellProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="text-2xl text-center mt-20">{t('loading_game', 'Loading game...')}</div>;
  }

  if (emptyState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <Card className="p-8 max-w-lg bg-orange-50 border-orange-200">
          <p className="text-2xl mb-4">
            {emptyStateMessage || t('ask_family_add_first', 'Ask a family member to add someone first.')}
          </p>
          <Button onClick={onExit} className="w-full text-xl py-4">{t('return_home', 'Return Home')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 max-w-2xl mx-auto w-full">
      <h2 className="text-4xl font-bold mb-8 text-center">{title}</h2>
      
      {children}

      <div className="mt-8">
        <Button variant="outline" onClick={onExit} className="text-lg">
          {t('exit_game', 'Exit Game')}
        </Button>
      </div>
    </div>
  );
}
