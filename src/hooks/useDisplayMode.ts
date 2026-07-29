import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export interface DisplayModeSetting {
  enabled: boolean;
  unlock_target_at: string | null;
  countdown_seconds: number;
}

export function useDisplayMode() {
  const [setting, setSetting] = useState<DisplayModeSetting>({
    enabled: false,
    unlock_target_at: null,
    countdown_seconds: 60
  });
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const fetchSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'display_mode')
        .maybeSingle();

      if (!error && data?.value) {
        let val = data.value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { val = null; }
        }
        if (val) setSetting(val);
      }
    } catch (e) {
      console.error('Erro ao buscar modo exibição:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();

    // Subscribe to realtime changes in system_settings
    const channel = supabase
      .channel('system_settings_display_mode')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        fetchSetting();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSetting]);

  // Countdown timer ticker
  useEffect(() => {
    if (!setting.unlock_target_at || setting.enabled) {
      setSecondsLeft(0);
      return;
    }

    const calcSeconds = () => {
      const targetTime = new Date(setting.unlock_target_at!).getTime();
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / 1000);
      return Math.max(0, diff);
    };

    setSecondsLeft(calcSeconds());

    const interval = setInterval(() => {
      const remaining = calcSeconds();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [setting.unlock_target_at, setting.enabled]);

  const isDisplayModeActive = setting.enabled === true;
  const isCountdownActive = !setting.enabled && setting.unlock_target_at !== null && secondsLeft > 0;
  const isUnlocked = !setting.enabled && (setting.unlock_target_at === null || secondsLeft <= 0);

  const updateSetting = async (newVal: DisplayModeSetting) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key: 'display_mode', value: newVal, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) throw error;
      setSetting(newVal);
      return true;
    } catch (e) {
      console.error('Erro ao atualizar modo exibição:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const activateDisplayMode = () => updateSetting({
    enabled: true,
    unlock_target_at: null,
    countdown_seconds: 60
  });

  const startUnlockCountdown = (seconds = 60) => {
    const targetDate = new Date(Date.now() + seconds * 1000).toISOString();
    return updateSetting({
      enabled: false,
      unlock_target_at: targetDate,
      countdown_seconds: seconds
    });
  };

  const unlockImmediately = () => updateSetting({
    enabled: false,
    unlock_target_at: null,
    countdown_seconds: 60
  });

  return {
    setting,
    loading,
    secondsLeft,
    isDisplayModeActive,
    isCountdownActive,
    isUnlocked,
    activateDisplayMode,
    startUnlockCountdown,
    unlockImmediately
  };
}
