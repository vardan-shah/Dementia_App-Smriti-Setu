import { db } from '../../db';
import type { Reminder } from './types';

export async function getReminders(elderId: string): Promise<Reminder[]> {
  const allReminders = await db.reminders.where('elderId').equals(elderId).toArray();
  const todayDate = new Date().toLocaleDateString('en-CA');
  
  // Reset completedToday if lastCompletedDate is not today
  const updatedReminders = await Promise.all(allReminders.map(async r => {
    if (r.completedToday && r.lastCompletedDate !== todayDate) {
      const updated = { ...r, completedToday: false };
      await db.reminders.update(r.id, { completedToday: false });
      return updated;
    }
    return r;
  }));

  return updatedReminders.sort((a, b) => a.time.localeCompare(b.time));
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
  await db.reminders.put(reminder);
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>) {
  await db.reminders.update(reminderId, updates);
}

export async function deleteReminder(reminderId: string) {
  await db.reminders.delete(reminderId);
}
