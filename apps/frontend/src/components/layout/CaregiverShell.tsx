import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../supabase';
import { Home, Users, Settings, LogOut, PlusCircle, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { LanguageSelector } from '../ui/LanguageSelector';

export function CaregiverShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caregiverId, currentCaregiverElder, setCurrentCaregiverElder, clearAuth } = useAuthStore();
  const { t } = useTranslation();
  const [elders, setElders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchElders() {
      if (!caregiverId) return;
      const { data } = await supabase
        .from('caregiver_elder_links')
        .select('elder_profiles(*)')
        .eq('caregiver_id', caregiverId);
      
      if (data) {
        const mappedElders = data.map((d: any) => d.elder_profiles).filter(Boolean);
        setElders(mappedElders);
        if (mappedElders.length > 0 && !currentCaregiverElder) {
          setCurrentCaregiverElder(mappedElders[0]);
        }
      }
    }
    fetchElders();
  }, [caregiverId, currentCaregiverElder, setCurrentCaregiverElder]);

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
            <h1 className="text-xl font-bold text-primary">{t('app_name', 'Smriti Setu')}</h1>
            <p className="text-sm text-gray-500">{t('caregiver_portal', 'Caregiver Portal')}</p>
          </div>
          <LanguageSelector />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/caregiver" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/caregiver' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Home size={20} />
            <span className="font-medium">{t('dashboard', 'Dashboard')}</span>
          </Link>

          <div className="pt-4 pb-2 flex items-center justify-between px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">{t('my_elders', 'My Elders')}</p>
            <Link to="/caregiver/create-elder" className="text-blue-600 hover:text-blue-800" title={t('add_new_elder', 'Add New Elder')}>
              <PlusCircle size={16} />
            </Link>
          </div>

          {elders.map(elder => (
            <button
              key={elder.id}
              onClick={() => {
                setCurrentCaregiverElder(elder);
                navigate('/caregiver');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                currentCaregiverElder?.id === elder.id 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <UserCircle size={20} />
              <span className="font-medium truncate">{elder.full_name}</span>
            </button>
          ))}

          {elders.length === 0 && (
            <p className="px-4 py-2 text-sm text-gray-400 italic">{t('no_elders_added', 'No elders added yet.')}</p>
          )}

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase">{t('system', 'System')}</p>
          </div>
          <button disabled className="w-full opacity-50 flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg text-left cursor-not-allowed">
            <Settings size={20} />
            <span className="font-medium">{t('analytics_coming_soon', 'Analytics (Coming Soon)')}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('logout', 'Logout')}</span>
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
