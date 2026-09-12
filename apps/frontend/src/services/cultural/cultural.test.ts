import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { getDailyPlan } from './dailyPlan';
import { getReminders, toggleReminderCompletion, addReminder } from './reminders';
import * as recommendationService from '../personalization/recommendation';
import type { CulturalProfile, Reminder } from './types';

vi.mock('../personalization/recommendation', () => ({
  recommendNextActivity: vi.fn().mockResolvedValue({ gameId: 'object-recognition', reason: 'Test', score: 1.0 })
}));

describe('North-East Cultural Personalization Engine', () => {
  beforeEach(async () => {
    await db.culturalProfiles.clear();
    await db.dailyPlans.clear();
    await db.reminders.clear();
  });

  describe('Daily Plan Generation', () => {
    it('generates a deterministic daily plan and reuses it on reload', async () => {
      const plan1 = await getDailyPlan('elder_1');
      expect(plan1.elderId).toBe('elder_1');
      expect(plan1.activityId).toBe('object-recognition');
      
      // Since no profile is set, it might use any available cultural prompt or undefined
      // depending on deterministic hash. Let's ensure it's generatedLocally
      expect(plan1.generatedLocally).toBe(true);

      const plan2 = await getDailyPlan('elder_1');
      expect(plan1.id).toBe(plan2.id); // Should be reused exactly
      
      const allPlans = await db.dailyPlans.toArray();
      expect(allPlans.length).toBe(1);
    });

    it('filters cultural prompts based on caregiver preferred region and themes', async () => {
      await db.culturalProfiles.put({
        id: 'elder_assam',
        elderId: 'elder_assam',
        region: 'Assam',
        preferredLanguage: 'as',
        preferredThemes: ['Food'], // Only Pitha matches Food in our demo pack
        updatedAt: new Date().toISOString()
      } as CulturalProfile);

      const plan = await getDailyPlan('elder_assam');
      expect(plan.language).toBe('as');
      // Given we filtered by Food and Region=Assam, the prompt ID must be assam_pitha
      expect(plan.culturalPromptId).toBe('assam_pitha');
    });

    it('maintains elder isolation', async () => {
      const planA = await getDailyPlan('elder_A');
      const planB = await getDailyPlan('elder_B');
      
      expect(planA.id).not.toBe(planB.id);
      expect(planA.elderId).toBe('elder_A');
      expect(planB.elderId).toBe('elder_B');
    });
  });

  describe('Reminders System', () => {
    it('persists and retrieves reminders locally', async () => {
      await addReminder({
        id: 'rem_1',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        completedToday: false,
        createdAt: new Date().toISOString()
      });

      const reminders = await getReminders('elder_1');
      expect(reminders.length).toBe(1);
      expect(reminders[0].title).toBe('Drink Water');
    });

    it('records reminder completion safely', async () => {
      await addReminder({
        id: 'rem_1',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        completedToday: false,
        createdAt: new Date().toISOString()
      });

      await toggleReminderCompletion('rem_1', true);
      const reminders = await getReminders('elder_1');
      expect(reminders[0].completedToday).toBe(true);
      
      const todayDate = new Date().toLocaleDateString('en-CA');
      expect(reminders[0].lastCompletedDate).toBe(todayDate);
    });

    it('resets completion status automatically on a new day', async () => {
      await addReminder({
        id: 'rem_1',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        completedToday: true,
        lastCompletedDate: '2020-01-01', // Simulate completion in the past
        createdAt: new Date().toISOString()
      });

      // getReminders triggers the date check
      const reminders = await getReminders('elder_1');
      expect(reminders[0].completedToday).toBe(false);
    });
  });
});
