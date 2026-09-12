import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { getReminders, addReminder, updateReminder, deleteReminder } from '../../services/cultural';
import type { Reminder } from '../../services/cultural/types';
import { Button } from '../../components/ui/Button';
import { Clock, Plus, Trash2, Edit2, Save, X, Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../db';

export function ManageReminders() {
  const { currentCaregiverElder } = useAuthStore();
  const elderId = currentCaregiverElder?.id;
  const { t } = useTranslation();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', time: '09:00', recurrence: 'DAILY' as 'DAILY'|'WEEKLY'|'ONCE', enabled: true });
  const [errorMsg, setErrorMsg] = useState('');

  const loadReminders = async () => {
    if (!elderId) return;
    const all = await db.reminders.where('elderId').equals(elderId).toArray();
    setReminders(all.sort((a, b) => a.time.localeCompare(b.time))); // Show all in management view
  };

  useEffect(() => {
    loadReminders();
  }, [elderId]);

  const handleSave = async () => {
    if (!elderId || !formData.title.trim()) return;
    setErrorMsg('');
    try {
      if (editingId) {
        await updateReminder(editingId, { ...formData });
      } else {
        const newReminder: Reminder = {
          id: crypto.randomUUID(),
          elderId,
          title: formData.title,
          time: formData.time,
          recurrence: formData.recurrence,
          enabled: formData.enabled,
          completedToday: false,
          createdAt: new Date().toISOString()
        };
        await addReminder(newReminder);
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({ title: '', time: '09:00', recurrence: 'DAILY', enabled: true });
      loadReminders();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEdit = (r: Reminder) => {
    setFormData({ title: r.title, time: r.time, recurrence: r.recurrence || 'DAILY', enabled: r.enabled });
    setEditingId(r.id);
    setIsAdding(true);
    setErrorMsg('');
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    loadReminders();
  };

  if (!elderId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('manage_reminders', 'Manage Reminders')}</h3>
          <p className="text-sm text-gray-500">
            {t('reminders_desc', 'Set simple daily reminders for the elder. Avoid medical instructions.')}
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => { setIsAdding(true); setErrorMsg(''); }} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            {t('add_reminder', 'Add Reminder')}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('reminder_title', 'Title')}</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('reminder_example', 'e.g., Drink water')}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('reminder_time', 'Time')}</label>
              <input 
                type="time" 
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('recurrence', 'Recurrence')}</label>
              <select
                value={formData.recurrence}
                onChange={e => setFormData({ ...formData, recurrence: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="DAILY">{t('daily', 'Daily')}</option>
                <option value="WEEKLY">{t('weekly', 'Weekly')}</option>
                <option value="ONCE">{t('once', 'Once')}</option>
              </select>
            </div>
          </div>
          {errorMsg && (
            <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={formData.enabled}
                onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                className="mr-2 rounded text-primary"
              />
              <span className="text-sm font-medium">{t('enabled', 'Enabled')}</span>
            </label>
            <div className="flex-1"></div>
            <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); }}>
              <X className="w-4 h-4 mr-2" />
              {t('cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {t('save', 'Save')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reminders.length === 0 && !isAdding ? (
          <p className="text-gray-500 text-sm text-center py-6">{t('no_reminders', 'No reminders configured yet.')}</p>
        ) : (
          reminders.map(r => (
            <div key={r.id} className={`flex items-center justify-between p-4 rounded-lg border ${r.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-4 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-800">{r.title}</p>
                  <p className="text-sm text-gray-500 flex items-center">
                    {r.time} 
                    <Repeat className="w-3 h-3 mx-2" />
                    {t(r.recurrence?.toLowerCase() || 'daily', r.recurrence || 'Daily')}
                    {!r.enabled && ` • ${t('disabled', 'Disabled')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(r)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
