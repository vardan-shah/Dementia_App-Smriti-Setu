import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { MemoryVault } from './MemoryVault';
import { PersonalizationInsights } from './PersonalizationInsights';
import { CreateRelative } from './CreateRelative';
import { Users, LogOut, Settings, Bell, BookOpen, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { clearAuth, currentCaregiverElder } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    navigate('/login');
  };

  const tabs = [
    { id: 'insights', label: 'Insights', icon: Activity },
    { id: 'relatives', label: 'Relatives', icon: Users },
    { id: 'memories', label: 'Memory Vault', icon: BookOpen }
  ];

  const [activeTab, setActiveTab] = useState('insights');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('caregiver_dashboard_title', 'Caregiver Dashboard')}
          </h1>
          {currentCaregiverElder && (
            <p className="text-gray-500 mt-1">Managing profile for {currentCaregiverElder.full_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:flex">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" className="hidden md:flex">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {!currentCaregiverElder ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-2">No Elder Selected</h3>
          <p>Please select or create an elder profile from the sidebar to manage their content.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
            {activeTab === 'insights' && <PersonalizationInsights />}
            {activeTab === 'relatives' && <CreateRelative />}
            {activeTab === 'memories' && <MemoryVault />}
          </div>
        </div>
      )}
    </div>
  );
}
