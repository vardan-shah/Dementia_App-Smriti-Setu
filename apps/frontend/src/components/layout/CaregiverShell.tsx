import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../supabase';
import { Home, Users, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { LanguageSelector } from '../ui/LanguageSelector';

export function CaregiverShell() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-surface-dark overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary">Smriti Setu</h1>
            <p className="text-sm text-gray-500">Caregiver Portal</p>
          </div>
          <LanguageSelector />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/caregiver" className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase">Manage</p>
          </div>
          <Link to="/caregiver/elders" className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Users size={20} />
            <span className="font-medium">Elders</span>
          </Link>
          {/* Placeholders for future phases */}
          <button disabled className="w-full opacity-50 flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg text-left cursor-not-allowed">
            <Settings size={20} />
            <span className="font-medium">Analytics (Coming Soon)</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <OfflineIndicator className="absolute top-0 left-0 w-full z-10" />
        <div className="flex-1 overflow-y-auto p-8 pt-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
