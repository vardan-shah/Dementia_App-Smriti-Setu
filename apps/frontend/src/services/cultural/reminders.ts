import { db } from '../../db';
import type { Reminder } from './types';

export function validateReminder(reminder: Partial<Reminder>): string | null {
  if (!reminder.elderId) return 'Elder ID is required';
  if (!reminder.title || reminder.title.trim().length === 0) return 'Title is required';
  if (reminder.title.length > 100) return 'Title is too long (max 100 characters)';
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!reminder.time || !timeRegex.test(reminder.time)) return 'Time must be in HH:mm format';
  
  if (reminder.recurrence && !['DAILY', 'WEEKLY', 'ONCE'].includes(reminder.recurrence)) {
    return 'Invalid recurrence pattern';
  }
  
  return null;
}

export async function getReminders(elderId: string): Promise<Reminder[]> {
  const allReminders = await db.reminders.where('elderId').equals(elderId).toArray();
  const todayDate = new Date().toLocaleDateString('en-CA');
  const todayDayOfWeek = new Date().getDay(); // 0 (Sun) to 6 (Sat)
  
  const updatedReminders = await Promise.all(allReminders.map(async r => {
    // Migrate legacy reminders
    if (!r.recurrence) {
      r.recurrence = 'DAILY';
      await db.reminders.update(r.id, { recurrence: 'DAILY' });
    }

    if (r.completedToday && r.lastCompletedDate !== todayDate) {
      const updated = { ...r, completedToday: false };
      await db.reminders.update(r.id, { completedToday: false });
      return updated;
    }
    return r;
  }));

  return updatedReminders.filter(r => {
    if (!r.enabled) return false;
    
    // ONCE: if completed anytime, never show again
    if (r.recurrence === 'ONCE' && r.lastCompletedDate) {
      return false;
    }

    // WEEKLY: show only if today's day of week matches the day it was created
    if (r.recurrence === 'WEEKLY') {
      const createdDayOfWeek = new Date(r.createdAt).getDay();
      if (todayDayOfWeek !== createdDayOfWeek) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => a.time.localeCompare(b.time));
}

export async function toggleReminderCompletion(reminderId: string, completed: boolean) {
  const reminder = await db.reminders.get(reminderId);
  if (reminder) {
    const todayDate = new Date().toLocaleDateString('en-CA');
    await db.reminders.update(reminderId, { 
      completedToday: completed,
      lastCompletedDate: completed ? todayDate : reminder.lastCompletedDate
    });
  }
}

export async function addReminder(reminder: Reminder) {
  const error = validateReminder(reminder);
  if (error) throw new Error(error);
  await db.reminders.put(reminder);
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>) {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) throw new Error('Reminder not found');
  
  const merged = { ...reminder, ...updates };
  const error = validateReminder(merged);
  if (error) throw new Error(error);
  
  await db.reminders.update(reminderId, updates);
}

export async function deleteReminder(reminderId: string) {
  await db.reminders.delete(reminderId);
}
