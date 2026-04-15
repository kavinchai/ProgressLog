import { useState } from 'react';
import api from '../api';

export function useDayActions({ date, weightEntry, nutritionEntry, workoutEntry, onRefetchW, onRefetchN, onRefetchWo }) {
  const [renamingSession, setRenamingSession] = useState(false);
  const [renameValue,     setRenameValue]     = useState('');

  async function deleteWeight() {
    if (!weightEntry) return;
    try { await api.delete(`/weight/${weightEntry.id}`); onRefetchW(); } catch { /* ignore */ }
  }

  async function deleteNutritionDay() {
    if (!nutritionEntry) return;
    try { await api.delete(`/nutrition/${nutritionEntry.id}`); onRefetchN(); } catch { /* ignore */ }
  }

  async function deleteWorkoutSession() {
    if (!workoutEntry) return;
    try { await api.delete(`/workouts/${workoutEntry.id}`); onRefetchWo(); } catch { /* ignore */ }
  }

  async function submitRename() {
    if (!workoutEntry) return;
    try {
      await api.patch(`/workouts/${workoutEntry.id}/name`, { sessionName: renameValue.trim() || null });
      onRefetchWo();
    } catch { /* ignore */ }
    setRenamingSession(false);
  }

  // Creates the nutrition day log if it doesn't exist yet, returns the log id.
  async function getOrCreateNutritionLogId() {
    if (nutritionEntry?.id) return nutritionEntry.id;
    try {
      const res = await api.post('/nutrition', { logDate: date, dayType: 'training', steps: null });
      onRefetchN();
      return res.data?.id;
    } catch { return null; }
  }

  return {
    renamingSession, setRenamingSession,
    renameValue,     setRenameValue,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, getOrCreateNutritionLogId,
  };
}
