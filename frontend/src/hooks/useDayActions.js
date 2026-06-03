import { useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

export function useDayActions({ date, weightEntry, nutritionEntry, workoutEntry, stepEntry, onRefetchW, onRefetchN, onRefetchWo, onRefetchS }) {
  const toast = useToast();
  const [renamingSession, setRenamingSession] = useState(false);
  const [renameValue,     setRenameValue]     = useState('');
  const [renameSaving,    setRenameSaving]    = useState(false);

  async function deleteWeight() {
    if (!weightEntry) return;
    try { await api.delete(`/weight/${weightEntry.id}`); onRefetchW(); }
    catch { toast.error('Failed to delete weight entry'); }
  }

  async function deleteNutritionDay() {
    if (!nutritionEntry) return;
    try { await api.delete(`/nutrition/${nutritionEntry.id}`); onRefetchN(); }
    catch { toast.error('Failed to delete nutrition log'); }
  }

  async function deleteWorkoutSession() {
    if (!workoutEntry) return;
    try { await api.delete(`/workouts/${workoutEntry.id}`); onRefetchWo(); }
    catch { toast.error('Failed to delete workout session'); }
  }

  async function submitRename() {
    if (!workoutEntry || renameSaving) return;
    setRenameSaving(true);
    try {
      await api.patch(`/workouts/${workoutEntry.id}/name`, { sessionName: renameValue.trim() || null });
      onRefetchWo();
      setRenamingSession(false);
    } catch { toast.error('Failed to rename workout'); }
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
    } catch { toast.error('Failed to save steps'); }
  }

  // Creates the nutrition day log if it doesn't exist yet, returns the log id.
  async function getOrCreateNutritionLogId() {
    if (nutritionEntry?.id) return nutritionEntry.id;
    try {
      const res = await api.post('/nutrition', { logDate: date, dayType: 'training' });
      onRefetchN();
      return res.data?.id;
    } catch {
      toast.error('Failed to create nutrition log');
      return null;
    }
  }

  return {
    renamingSession, setRenamingSession,
    renameValue,     setRenameValue,
    renameSaving,
    deleteWeight, deleteNutritionDay, deleteWorkoutSession, submitRename, saveSteps, getOrCreateNutritionLogId,
  };
}
