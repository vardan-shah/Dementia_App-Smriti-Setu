import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from './Button';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={cn('bg-accent text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium', className)}>
      <WifiOff size={16} />
      <span>{t('offline_mode_active', 'Offline Mode Active')}</span>
    </div>
  );
}
