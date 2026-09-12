import { db } from '../../db';
import { normalizePerformance } from './normalization';
import type { CognitiveBaseline, CognitiveCategory, PerformanceRecord } from './types';

export const MIN_BASELINE_SESSIONS = 3;

// Mapping of games to their primary cognitive categories
const GAME_CATEGORY_MAP: Record<string, CognitiveCategory[]> = {
  'object-recognition': ['Memory'],
  'recall': ['Memory'],
  'language-exercises': ['Language']
};

export async function computeBaselines(elderId: string): Promise<CognitiveBaseline[]> {
  // First, ensure all legacy sessions have been normalized to performanceRecords
  await migrateLegacySessions(elderId);

  const records = await db.performanceRecords.where('elderId').equals(elderId).toArray();
  const completedRecords = records.filter(r => r.status === 'COMPLETED');
  
  if (completedRecords.length === 0) {
    return []; // No data to build baseline
  }

  const categoryBuckets: Record<CognitiveCategory, PerformanceRecord[]> = {
    'Memory': [],
    'Attention': [],
    'Language': [],
    'Reaction': [],
    'Engagement': []
  };

  records.forEach(r => {
    // Engagement considers all sessions (STARTED, COMPLETED, ABANDONED)
    categoryBuckets['Engagement'].push(r);
    
    if (r.status === 'COMPLETED') {
      const cats = GAME_CATEGORY_MAP[r.gameId] || [];
      cats.forEach(c => categoryBuckets[c].push(r));
      
      // Reaction category gets all completed games where reaction time is tracked
      if (r.avgReactionTimeMs > 0) {
        categoryBuckets['Reaction'].push(r);
      }
    }
  });

  const baselines: CognitiveBaseline[] = [];

  for (const [catStr, catRecords] of Object.entries(categoryBuckets)) {
    const category = catStr as CognitiveCategory;
    if (catRecords.length >= MIN_BASELINE_SESSIONS) {
      baselines.push(calculateCategoryBaseline(elderId, category, catRecords));
    }
  }

  // Persist to Dexie
  await db.transaction('rw', db.cognitiveBaselines, async () => {
    for (const b of baselines) {
      await db.cognitiveBaselines.put(b);
    }
  });

  return baselines;
}

// Ensure all raw sessions have a corresponding performanceRecord
async function migrateLegacySessions(elderId: string) {
  const sessions = await db.sessions.where('elderId').equals(elderId).toArray();
  const existingRecords = await db.performanceRecords.where('elderId').equals(elderId).toArray();
  
  const existingSessionIds = new Set(existingRecords.map(r => r.sessionId));
  const missingSessions = sessions.filter(s => !existingSessionIds.has(s.id));
  
  if (missingSessions.length > 0) {
    const newRecords = missingSessions.map(normalizePerformance);
    await db.transaction('rw', db.performanceRecords, async () => {
      await db.performanceRecords.bulkPut(newRecords);
    });
  }
}

function calculateCategoryBaseline(elderId: string, category: CognitiveCategory, records: PerformanceRecord[]): CognitiveBaseline {
  let mean = 0;
  let variance = 0;
  
  if (category === 'Engagement') {
    // Engagement is based on completion rate
    const completed = records.filter(r => r.status === 'COMPLETED').length;
    mean = completed / records.length;
  } else if (category === 'Reaction') {
    // Reaction is based on avgReactionTimeMs
    const times = records.map(r => r.avgReactionTimeMs).filter(t => t > 0);
    if (times.length > 0) {
      mean = times.reduce((a, b) => a + b, 0) / times.length;
      variance = times.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / times.length;
    }
  } else {
    // Memory, Language, Attention -> accuracy
    const accuracies = records.map(r => r.accuracy);
    if (accuracies.length > 0) {
      mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
      variance = accuracies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / accuracies.length;
    }
  }

  const sourceGameIds = Array.from(new Set(records.map(r => r.gameId)));

  return {
    id: `${elderId}_${category}`,
    elderId,
    category,
    mean,
    variance,
    sampleCount: records.length,
    lastUpdatedAt: new Date().toISOString(),
    sourceGameIds
  };
}
