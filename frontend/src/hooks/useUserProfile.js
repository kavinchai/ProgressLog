import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const DEFAULT_GOALS = {
  calorieTargetTraining: 2600,
  calorieTargetRest: 2000,
  proteinTarget: 180,
};

export default function useUserProfile() {
  const [goals, setGoals]     = useState(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.get('/profile/goals')
      .then((res) => { if (!cancelled) setGoals(res.data); })
      .catch(() => { /* keep defaults silently */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const saveGoals = useCallback(async (updated) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put('/profile/goals', updated);
      setGoals(res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save goals');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { goals, loading, saving, error, saveGoals };
}
