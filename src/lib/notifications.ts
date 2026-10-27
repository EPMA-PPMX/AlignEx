import { supabase } from './supabase';

export type NotificationType = 'project_update' | 'deadline' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  tenant_name: string | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_id: string | null;
  related_type: string | null;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  project: boolean;
  deadline: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  email: false,
  push: true,
  project: true,
  deadline: true,
};

export async function syncGeneratedNotifications(userId: string, tenantName: string | null, preferences: NotificationPreferences) {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, updated_at, schedule_finish_date')
    .eq('tenant_name', tenantName)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const notifications = (projects || []).flatMap(project => {
    const generated: Omit<AppNotification, 'id' | 'created_at' | 'read_at'>[] = [];
    const updatedAt = project.updated_at ? new Date(project.updated_at).getTime() : 0;

    if (preferences.project && updatedAt > now - thirtyDays) {
      generated.push({
        user_id: userId,
        tenant_name: tenantName,
        notification_type: 'project_update',
        title: `${project.name} was updated`,
        message: `Project details were updated on ${new Date(project.updated_at).toLocaleDateString()}.`,
        related_id: project.id,
        related_type: 'project',
        dedupe_key: `project-update:${project.id}:${project.updated_at}`,
      });
    }

    if (preferences.deadline && project.schedule_finish_date) {
      const deadline = new Date(project.schedule_finish_date);
      const daysUntil = Math.ceil((deadline.getTime() - now) / (24 * 60 * 60 * 1000));
      if (daysUntil >= 0 && daysUntil <= 30) {
        generated.push({
          user_id: userId,
          tenant_name: tenantName,
          notification_type: 'deadline',
          title: `${project.name} deadline is approaching`,
          message: `The project is due on ${deadline.toLocaleDateString()}.`,
          related_id: project.id,
          related_type: 'project',
          dedupe_key: `deadline:${project.id}:${project.schedule_finish_date}`,
        });
      }
    }

    return generated;
  });

  if (notifications.length === 0) return;

  const { error: insertError } = await supabase
    .from('app_notifications')
    .upsert(notifications, { onConflict: 'dedupe_key', ignoreDuplicates: true });

  if (insertError) throw insertError;
}

export async function fetchNotifications(userId: string, tenantName: string | null) {
  const { data, error } = await supabase
    .from('app_notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_name', tenantName)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as AppNotification[];
}
