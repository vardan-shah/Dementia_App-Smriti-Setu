import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { supabase } from '../../supabase';
import { LogOut, Home, Brain, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { LanguageSelector } from '../ui/LanguageSelector';

export function ElderShell() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const { t } = useTranslation();
  const { fontSize, highContrast } = useSettingsStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    navigate('/');
  };

  useEffect(() => {
    // Apply accessibility settings to HTML element
    const html = document.documentElement;
    
    html.classList.remove('text-normal', 'text-large', 'text-xlarge', 'high-contrast');
    
    html.classList.add(`text-${fontSize}`);
    if (highContrast) {
      html.classList.add('high-contrast');
    }
  }, [fontSize, highContrast]);

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${highContrast ? 'bg-black text-white' : 'bg-[#f4f3ec] text-gray-800'}`}>
      <OfflineIndicator className="w-full" />
      
      {/* Top Bar for Elder */}
      <header className="flex justify-between items-center p-6 bg-white shadow-sm">
        <h1 className="text-3xl font-bold">{t('app_name', 'Smriti Setu')}</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <button 
            onClick={handleLogout}
            className="p-4 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={32} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>

      {/* Huge Bottom Navigation */}
      <nav className="flex bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => navigate('/elder')} className="flex-1 flex flex-col items-center justify-center p-6 gap-2 hover:bg-gray-100 transition-colors border-r border-gray-200">
          <Home size={40} className="text-primary" />
          <span className="text-xl font-medium">{t('home', 'Home')}</span>
        </button>
        <button onClick={() => navigate('/elder/games')} className="flex-1 flex flex-col items-center justify-center p-6 gap-2 hover:bg-gray-100 transition-colors border-r border-gray-200">
          <Brain size={40} className="text-primary" />
          <span className="text-xl font-medium">{t('play_game', 'Play')}</span>
        </button>
        <button onClick={() => navigate('/elder/memories')} className="flex-1 flex flex-col items-center justify-center p-6 gap-2 hover:bg-gray-100 transition-colors border-r border-gray-200">
          <ImageIcon size={40} className="text-primary" />
          <span className="text-xl font-medium">{t('memories', 'Memories')}</span>
        </button>
        <button onClick={() => navigate('/elder/help')} className="flex-1 flex flex-col items-center justify-center p-6 gap-2 hover:bg-gray-100 transition-colors">
          <HelpCircle size={40} className="text-primary" />
          <span className="text-xl font-medium">{t('help', 'Help')}</span>
        </button>
      </nav>
    </div>
  );
}
