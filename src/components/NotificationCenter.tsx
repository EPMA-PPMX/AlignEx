import React, { useEffect, useState } from 'react';
import { Bell, CalendarClock, Check, CircleDot, FolderKanban, RefreshCw } from 'lucide-react';
import { DEMO_TENANT_NAME } from '../lib/useCurrentUser';
import { AppNotification, defaultNotificationPreferences, fetchNotifications, NotificationPreferences, syncGeneratedNotifications } from '../lib/notifications';
import { supabase } from '../lib/supabase';

interface NotificationCenterProps {
  userId: string;
  preferences?: NotificationPreferences;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, preferences }) => {
  const [effectivePreferences, setEffectivePreferences] = useState<NotificationPreferences>(preferences || defaultNotificationPreferences);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      await syncGeneratedNotifications(userId, DEMO_TENANT_NAME, effectivePreferences);
      setNotifications(await fetchNotifications(userId, DEMO_TENANT_NAME));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preferences) {
      setEffectivePreferences(preferences);
      return;
    }
    supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', userId)
      .eq('preference_key', 'notification_preferences')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading notification preferences:', error);
          return;
        }
        setEffectivePreferences({ ...defaultNotificationPreferences, ...(data?.preference_value || {}) });
      });
  }, [userId, preferences]);

  useEffect(() => {
    loadNotifications();
  }, [userId, effectivePreferences.project, effectivePreferences.deadline]);

  const unreadCount = notifications.filter(notification => !notification.read_at).length;

  const markAsRead = async (notification: AppNotification) => {
    if (!notification.read_at) {
      const { error } = await supabase
        .from('app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id);
      if (error) {
        console.error('Error marking notification read:', error);
        return;
      }
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
    setSelected(notification);
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_name', DEMO_TENANT_NAME)
      .is('read_at', null);
    if (error) {
      console.error('Error marking notifications read:', error);
      return;
    }
    setNotifications(current => current.map(notification => ({ ...notification, read_at: notification.read_at || new Date().toISOString() })));
  };

  const iconFor = (type: AppNotification['notification_type']) => type === 'deadline'
    ? <CalendarClock className="w-5 h-5 text-orange-600" />
    : <FolderKanban className="w-5 h-5 text-blue-600" />;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button onClick={() => setOpen(current => !current)} className="flex items-center gap-3 text-left">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">{unreadCount}</span>}
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-900">Notifications</span>
            <span className="block text-sm text-slate-500">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={loadNotifications} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Refresh notifications"><RefreshCw className="w-4 h-4" /></button>
          {unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm font-medium text-blue-700 hover:text-blue-900">Mark all read</button>}
        </div>
      </div>

      {open && (
        <div className="divide-y divide-slate-100">
          {loading ? <div className="p-6 text-sm text-slate-500">Loading notifications...</div> : notifications.length === 0 ? <div className="p-8 text-center"><CircleDot className="mx-auto w-8 h-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">No notifications yet</p></div> : notifications.map(notification => (
            <button key={notification.id} onClick={() => markAsRead(notification)} className={`w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors ${!notification.read_at ? 'bg-blue-50/40' : ''}`}>
              <span className="mt-0.5">{iconFor(notification.notification_type)}</span>
              <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="font-medium text-slate-900 truncate">{notification.title}</span>{!notification.read_at && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}</span><span className="block mt-1 text-sm text-slate-600">{notification.message}</span><span className="block mt-2 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</span></span>
            </button>
          ))}
        </div>
      )}

      {selected && <div className="border-t border-slate-100 bg-slate-50 px-5 py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-900">{selected.title}</p><p className="mt-1 text-sm text-slate-600">{selected.message}</p></div><button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-900">Close</button></div><div className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><Check className="w-4 h-4" /> Read</div></div>}
    </section>
  );
};

export default NotificationCenter;
