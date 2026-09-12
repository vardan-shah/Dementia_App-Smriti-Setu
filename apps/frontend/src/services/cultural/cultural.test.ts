import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { getDailyPlan } from './dailyPlan';
import { getReminders, toggleReminderCompletion, addReminder, validateReminder } from './reminders';
import * as recommendationService from '../personalization/recommendation';
import type { CulturalProfile, Reminder } from './types';
import { ALL_CULTURAL_CONTENT } from '../../config/culturalPacks';

vi.mock('../personalization/recommendation', () => ({
  recommendNextActivity: vi.fn().mockResolvedValue({ gameId: 'object-recognition', reason: 'Test', score: 1.0 })
}));

describe('North-East Cultural Personalization Engine', () => {
  beforeEach(async () => {
    await db.culturalProfiles.clear();
    await db.dailyPlans.clear();
    await db.reminders.clear();
    await db.memories.clear();
  });

  describe('Cultural Content Pack Validation', () => {
    it('contains all required localizations for all states', () => {
      const states = new Set(ALL_CULTURAL_CONTENT.map(c => c.region));
      expect(states.size).toBe(8); // Assam, Arunachal, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura

      ALL_CULTURAL_CONTENT.forEach(item => {
        expect(item.title.en).toBeTruthy();
        expect(item.title.hi).toBeTruthy();
        expect(item.title.as).toBeTruthy();
        expect(item.title.bn).toBeTruthy();
        
        expect(item.prompt.en).toBeTruthy();
        expect(item.prompt.hi).toBeTruthy();
        expect(item.prompt.as).toBeTruthy();
        expect(item.prompt.bn).toBeTruthy();

        expect(item.contentLocaleSupport).toContain('en');
        expect(item.contentLocaleSupport).toContain('hi');
        expect(item.contentLocaleSupport).toContain('as');
        expect(item.contentLocaleSupport).toContain('bn');
      });
    });
  });

  describe('Daily Plan Generation', () => {
    it('generates a deterministic daily plan and reuses it on reload', async () => {
      const plan1 = await getDailyPlan('elder_1');
      expect(plan1.elderId).toBe('elder_1');
      expect(plan1.activityId).toBe('object-recognition');
      expect(plan1.generatedLocally).toBe(true);

      const plan2 = await getDailyPlan('elder_1');
      expect(plan1.id).toBe(plan2.id); // Should be reused exactly
      
      const allPlans = await db.dailyPlans.toArray();
      expect(allPlans.length).toBe(1);
    });

    it('prioritizes memory vault content when available', async () => {
      await db.memories.put({
        id: 'mem_1',
        elderId: 'elder_memory',
        title: 'Grandmother prepared pitha',
        createdAt: new Date().toISOString()
      } as any);

      const plan = await getDailyPlan('elder_memory');
      expect(plan.memoryId).toBe('mem_1');
      expect(plan.culturalPromptId).toBeUndefined();
    });

    it('filters out recently used cultural prompts', async () => {
      await db.culturalProfiles.put({
        id: 'elder_assam',
        elderId: 'elder_assam',
        region: 'Assam',
        preferredLanguage: 'as',
        preferredThemes: ['Food'], // Only Pitha matches Food in our demo pack
        updatedAt: new Date().toISOString()
      } as CulturalProfile);

      // We only have one Food item for Assam in the demo pack: assam_pitha
      const plan1 = await getDailyPlan('elder_assam');
      expect(plan1.culturalPromptId).toBe('assam_pitha');

      // If we manually insert a daily plan for today, getDailyPlan returns it.
      // We want to test history logic. 
      // Let's clear the dailyPlan to simulate a NEW day, but with assam_pitha in history
      await db.dailyPlans.clear();
      await db.dailyPlans.put({
        id: 'elder_assam_PAST_DAY',
        elderId: 'elder_assam',
        date: '2000-01-01',
        activityId: 'recall',
        culturalPromptId: 'assam_pitha',
        language: 'as',
        generatedLocally: true,
        completed: true,
        createdAt: new Date().toISOString()
      });

      // Now it should realize assam_pitha is used. But since it's the ONLY themed item available, 
      // the rotation logic resets history and uses it anyway. Let's add a second theme to see it pick the other one.
      await db.culturalProfiles.update('elder_assam', { preferredThemes: ['Food', 'Nature'] }); // assam_tea is nature

      const plan2 = await getDailyPlan('elder_assam');
      expect(plan2.culturalPromptId).toBe('assam_tea'); // skips pitha because it's in history!
    });
  });

  describe('Reminders System', () => {
    it('validates reminder structures correctly', () => {
      expect(validateReminder({} as any)).toBe('Elder ID is required');
      expect(validateReminder({ elderId: '1' } as any)).toBe('Title is required');
      expect(validateReminder({ elderId: '1', title: 'A' } as any)).toBe('Time must be in HH:mm format');
      expect(validateReminder({ elderId: '1', title: 'A', time: '25:00' } as any)).toBe('Time must be in HH:mm format');
      expect(validateReminder({ elderId: '1', title: 'A', time: '09:00', recurrence: 'INVALID' as any } as any)).toBe('Invalid recurrence pattern');
      expect(validateReminder({ elderId: '1', title: 'A', time: '09:00', recurrence: 'DAILY' } as any)).toBeNull();
    });

    it('persists and retrieves reminders locally', async () => {
      await addReminder({
        id: 'rem_1',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        recurrence: 'DAILY',
        completedToday: false,
        createdAt: new Date().toISOString()
      });

      const reminders = await getReminders('elder_1');
      expect(reminders.length).toBe(1);
    });

    it('hides ONCE reminders after completion', async () => {
      await addReminder({
        id: 'rem_once',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        recurrence: 'ONCE',
        completedToday: false,
        createdAt: new Date().toISOString()
      });

      await toggleReminderCompletion('rem_once', true);
      const reminders = await getReminders('elder_1');
      expect(reminders.length).toBe(0); // Should be completely hidden because it was completed
    });

    it('resets DAILY completion status on a new day', async () => {
      await addReminder({
        id: 'rem_1',
        elderId: 'elder_1',
        title: 'Drink Water',
        time: '09:00',
        enabled: true,
        recurrence: 'DAILY',
        completedToday: true,
        lastCompletedDate: '2020-01-01', // Simulate completion in the past
        createdAt: new Date().toISOString()
      });

      const reminders = await getReminders('elder_1');
      expect(reminders[0].completedToday).toBe(false);
    });
  });
});
