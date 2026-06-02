import { useState } from 'react';
import api from '../api';

export function useDayActions({ date, weightEntry, nutritionEntry, workoutEntry, stepEntry, onRefetchW, onRefetchN, onRefetchWo, onRefetchS }) {
  const [renamingSession, setRenamingSession] = useState(false);
  const [renameValue,     setRenameValue]     = useState('');
  const [renameSaving,    setRenameSaving]    = useState(false);

  async function deleteWeight() {
    if (!weightEntry) return;
    try { await api.delete(`/weight/${weightEntry.id}`); onRefetchW(); } catch (err) { console.warn('deleteWeight failed:', err); }
  }

  async function deleteNutritionDay() {
    if (!nutritionEntry) return;
    try { await api.delete(`/nutrition/${nutritionEntry.id}`); onRefetchN(); } catch (err) { console.warn('deleteNutritionDay failed:', err); }
  }

  async function deleteWorkoutSession() {
    if (!workoutEntry) return;
    try { await api.delete(`/workouts/${workoutEntry.id}`); onRefetchWo(); } catch (err) { console.warn('deleteWorkoutSession failed:', err); }
  }

  async function submitRename() {
    if (!workoutEntry || renameSaving) return;
    setRenameSaving(true);
    try {
      await api.patch(`/workouts/${workoutEntry.id}/name`, { sessionName: renameValue.trim() || null });
      onRefetchWo();
      setRenamingSession(false);
    } catch (err) { console.warn('submitRename failed:', err); }
    finally { setRenameSaving(false); }
  }

  async function saveSteps(steps) {
    try {
      if (steps != null) {
        await api.post('/steps', { logDate: date, steps: parseInt(steps) });
      } else if (stepEntry) {
        await api.delete(`/steps/${stepEntry.id}`);
      }
      onRefetchS();
    } catch (err) { console.warn('saveSteps failed:', err); }
  }

  // Creates the nutrition day log if it doesn't exist yet, returns the log id.
  async function getOrCreateNutritionLogId() {
    if (nutritionEntry?.id) return nutritionEntry.id;
    try {
      const res = await api.post('/nutrition', { logDate: date, dayType: 'training' });
      onRefetchN();
      return res.data?.id;
    } catch { return null; }
  }

  return {
    renamingSession, setRenamingSession,
    renameValue,     setRenameValue,
    renameSaving,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, saveSteps, getOrCreateNutritionLogId,
  };
}
