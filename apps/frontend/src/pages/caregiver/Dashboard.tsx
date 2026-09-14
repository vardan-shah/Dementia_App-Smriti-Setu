import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { MemoryVault } from './MemoryVault';
import { ElderOverview } from './ElderOverview';
import { CreateRelative } from './CreateRelative';
import { Users, LogOut, Settings, Bell, BookOpen, Activity, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';

import { CulturalSettings } from './CulturalSettings';
import { ManageReminders } from './ManageReminders';

export function Dashboard() {
  const { clearAuth, currentCaregiverElder } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    navigate('/');
  };

  const tabs = [
    { id: 'overview', label: t('overview', 'Overview'), icon: Activity },
    { id: 'relatives', label: t('relatives', 'Relatives'), icon: Users },
    { id: 'memories', label: t('memory_vault', 'Memory Vault'), icon: BookOpen },
    { id: 'reminders', label: t('reminders', 'Reminders'), icon: Clock },
    { id: 'settings', label: t('settings', 'Settings'), icon: Settings }
  ];

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('caregiver_dashboard_title', 'Caregiver Dashboard')}
          </h1>
          {currentCaregiverElder && (
            <p className="text-gray-500 mt-1">{t('managing_profile_for', 'Managing profile for')} {currentCaregiverElder.full_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:flex">
            <Bell className="w-4 h-4 mr-2" />
            {t('notifications', 'Notifications')}
          </Button>
          <Button variant="outline" className="hidden md:flex">
            <Settings className="w-4 h-4 mr-2" />
            {t('settings', 'Settings')}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('sign_out', 'Sign Out')}
          </Button>
        </div>
      </div>

      {!currentCaregiverElder ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-2">{t('no_elder_selected', 'No Elder Selected')}</h3>
          <p className="mb-4">{t('please_select_elder_sidebar', 'Please select or create an elder profile from the sidebar to manage their content.')}</p>
          <Button onClick={() => navigate('/caregiver/create-elder')} variant="primary">
            Create Elder Profile
          </Button>
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
            {activeTab === 'overview' && <ElderOverview setActiveTab={setActiveTab} />}
            {activeTab === 'relatives' && <CreateRelative />}
            {activeTab === 'memories' && <MemoryVault />}
            {activeTab === 'settings' && <CulturalSettings />}
            {activeTab === 'reminders' && <ManageReminders />}
          </div>
        </div>
      )}
    </div>
  );
}
