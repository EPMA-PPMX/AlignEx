import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  full_name: string;
  system_role: 'Project Manager' | 'Team Member' | 'Portfolio Manager';
  resource_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  is_enabled: boolean;
  position_order: number;
  size: 'small' | 'medium' | 'large';
  settings: Record<string, any>;
}

export const DEMO_USER_ID = '65340f6a-cf92-4490-b36a-57b5452688f8';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (userError) throw userError;

      if (userData) {
        setUser(userData);

        const { data: widgetsData, error: widgetsError } = await supabase
          .from('user_dashboard_widgets')
          .select('*')
          .eq('user_id', userData.id)
          .order('position_order');

        if (widgetsError) throw widgetsError;

        setWidgets(widgetsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWidgetSettings = async (widgetId: string, settings: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('user_dashboard_widgets')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(widgets.map(w => w.id === widgetId ? { ...w, settings } : w));
    } catch (err: any) {
      console.error('Error updating widget settings:', err);
    }
  };

  const toggleWidget = async (widgetId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('user_dashboard_widgets')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('id', widgetId);

      if (error) throw error;

      fetchCurrentUser();
    } catch (err: any) {
      console.error('Error toggling widget:', err);
    }
  };

  const reorderWidgets = async (reorderedWidgets: DashboardWidget[]) => {
    try {
      const updates = reorderedWidgets.map(widget => ({
        id: widget.id,
        position_order: widget.position_order,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('user_dashboard_widgets')
          .update({ position_order: update.position_order, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }

      fetchCurrentUser();
    } catch (err: any) {
      console.error('Error reordering widgets:', err);
    }
  };

  const changeWidgetSize = async (widgetId: string, size: 'small' | 'medium' | 'large') => {
    try {
      const { error } = await supabase
        .from('user_dashboard_widgets')
        .update({ size, updated_at: new Date().toISOString() })
        .eq('id', widgetId);

      if (error) throw error;

      fetchCurrentUser();
    } catch (err: any) {
      console.error('Error changing widget size:', err);
    }
  };

  return {
    user,
    widgets,
    loading,
    error,
    updateWidgetSettings,
    toggleWidget,
    reorderWidgets,
    changeWidgetSize,
    refetch: fetchCurrentUser
  };
}
