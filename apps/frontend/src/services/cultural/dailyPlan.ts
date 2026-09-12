import { db } from '../../db';
import type { DailyPlan, CulturalProfile, CulturalContentItem } from './types';
import { recommendNextActivity } from '../personalization/recommendation';
import { ALL_CULTURAL_CONTENT } from '../../config/culturalPacks';

export async function getDailyPlan(elderId: string): Promise<DailyPlan> {
  const todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  
  // Try to find existing plan for today
  const existingPlan = await db.dailyPlans
    .where('[elderId+date]')
    .equals([elderId, todayDate])
    .first();

  if (existingPlan) {
    return existingPlan;
  }

  // Generate new plan deterministically
  const recommendation = await recommendNextActivity(elderId);
  const profile = await db.culturalProfiles.where('elderId').equals(elderId).first();

  let culturalPromptId: string | undefined = undefined;

  // Filter content by preferred region and themes
  let availableContent = ALL_CULTURAL_CONTENT;
  if (profile) {
    if (profile.region) {
      availableContent = availableContent.filter(c => c.region === profile.region);
    }
    if (profile.preferredThemes && profile.preferredThemes.length > 0) {
      const themedContent = availableContent.filter(c => profile.preferredThemes.includes(c.theme));
      if (themedContent.length > 0) {
        availableContent = themedContent;
      }
    }
  }

  if (availableContent.length > 0) {
    // Deterministic selection based on date string so it doesn't shift on reload
    const hash = todayDate.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
    const index = hash % availableContent.length;
    culturalPromptId = availableContent[index].id;
  }

  const newPlan: DailyPlan = {
    id: `${elderId}_${todayDate}`,
    elderId,
    date: todayDate,
    activityId: recommendation.gameId,
    culturalPromptId,
    language: profile?.preferredLanguage || 'en',
    generatedLocally: true,
    completed: false,
    createdAt: new Date().toISOString()
  };

  await db.dailyPlans.put(newPlan);
  return newPlan;
}

export async function markPlanCompleted(planId: string) {
  const plan = await db.dailyPlans.get(planId);
  if (plan) {
    await db.dailyPlans.update(planId, { completed: true });
  }
}
