import { db } from '../../db';
import type { DailyPlan } from './types';
import { recommendNextActivity } from '../personalization/recommendation';
import { ALL_CULTURAL_CONTENT } from '../../config/culturalPacks';

export async function getDailyPlan(elderId: string): Promise<DailyPlan> {
  const todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  
  const existingPlan = await db.dailyPlans
    .where('[elderId+date]')
    .equals([elderId, todayDate])
    .first();

  if (existingPlan) {
    return existingPlan;
  }

  const recommendation = await recommendNextActivity(elderId);
  const profile = await db.culturalProfiles.where('elderId').equals(elderId).first();
  const language = profile?.preferredLanguage || 'en';

  let culturalPromptId: string | undefined = undefined;
  let memoryId: string | undefined = undefined;

  const pastPlans = await db.dailyPlans.where('elderId').equals(elderId).toArray();
  const usedMemories = new Set(pastPlans.map(p => p.memoryId).filter(Boolean));
  const usedPrompts = new Set(pastPlans.map(p => p.culturalPromptId).filter(Boolean));

  // Determine hash for deterministic selection
  const hash = todayDate.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);

  // 1. Check for Memory Vault entries (unused memories preferred)
  const allMemories = await db.memories.where('elderId').equals(elderId).toArray();
  const validMemories = allMemories.filter(m => m.title);
  
  let candidateMemories = validMemories.filter(m => !usedMemories.has(m.id));
  
  // If all memories are used but we want to rotate, we can clear memory history context
  if (candidateMemories.length === 0 && validMemories.length > 0) {
    candidateMemories = validMemories; 
  }

  if (candidateMemories.length > 0) {
    // We prioritize caregiver memories. We pick deterministically.
    const index = hash % candidateMemories.length;
    memoryId = candidateMemories[index].id;
  } else {
    // 2. Select cultural prompt
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

    // Filter by language availability
    availableContent = availableContent.filter(c => c.contentLocaleSupport.includes(language) || c.contentLocaleSupport.includes('en'));

    // Filter out used prompts
    let candidatePrompts = availableContent.filter(c => !usedPrompts.has(c.id));
    
    // If all are used, reset history for this pool
    if (candidatePrompts.length === 0 && availableContent.length > 0) {
      candidatePrompts = availableContent;
    }

    if (candidatePrompts.length > 0) {
      const index = hash % candidatePrompts.length;
      culturalPromptId = candidatePrompts[index].id;
    }
  }

  const newPlan: DailyPlan = {
    id: `${elderId}_${todayDate}`,
    elderId,
    date: todayDate,
    activityId: recommendation.gameId,
    culturalPromptId,
    memoryId,
    language,
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
