import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';

export function Notifications() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-800">{t('notifications', 'Notifications')}</h2>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('loading', 'Loading...')}</p>
      ) : notifications.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-xl text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('no_notifications', 'No notifications yet.')}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {notifications.map(n => (
            <li key={n.id} className={`p-4 rounded-xl border ${n.read_at ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-semibold ${n.read_at ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</h3>
                  <p className="text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {t('mark_read', 'Mark Read')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
