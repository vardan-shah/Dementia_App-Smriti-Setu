import { db } from '../../db';

export interface ActivityRecommendation {
  gameId: string;
  reason: string;
}

const ALL_GAMES = [
  { id: 'object-recognition', name: 'Memory Match' },
  { id: 'recall', name: 'Memory Recall' },
  { id: 'language-exercises', name: 'Match the Word' }
];

export async function recommendNextActivity(elderId: string): Promise<ActivityRecommendation> {
  const recentSessions = await db.sessions
    .where('elderId')
    .equals(elderId)
    .reverse()
    .limit(10)
    .toArray();

  if (recentSessions.length === 0) {
    return {
      gameId: 'object-recognition',
      reason: 'A great starting point to build your personal baseline.'
    };
  }

  // Calculate recency penalty (higher index = played further in the past)
  // If not played in last 10, index is Infinity
  const lastPlayedIndex = (gameId: string) => {
    const idx = recentSessions.findIndex(s => s.gameId === gameId);
    return idx === -1 ? Infinity : idx;
  };

  // Check recent performance
  const gameStats = ALL_GAMES.map(game => {
    const gameSessions = recentSessions.filter(s => s.gameId === game.id);
    const recency = lastPlayedIndex(game.id);
    
    let errorRate = 0;
    let attempts = 0;
    
    if (gameSessions.length > 0) {
      const recentM = gameSessions.slice(0, 3).map(s => (s as any).metrics).filter(Boolean);
      let errors = 0;
      let total = 0;
      recentM.forEach(m => {
        errors += m.errors || 0;
        total += (m.correct || 0) + (m.errors || 0);
      });
      errorRate = total > 0 ? errors / total : 0;
      attempts = gameSessions.length;
    }

    return {
      gameId: game.id,
      name: game.name,
      recency,
      errorRate,
      attempts
    };
  });

  // Sort by combination of least recently played and acceptable performance
  // We want to avoid recommending a game they are currently struggling heavily with (> 50% error rate),
  // unless it's been a long time since they played it.
  
  gameStats.sort((a, b) => {
    // Heavy penalty for recent games
    const scoreA = (a.recency === 0 ? -100 : a.recency) - (a.errorRate * 5);
    const scoreB = (b.recency === 0 ? -100 : b.recency) - (b.errorRate * 5);
    return scoreB - scoreA; // descending
  });

  const top = gameStats[0];
  
  let reason = `It's been a while since you played ${top.name}.`;
  if (top.recency === Infinity) {
    reason = `Let's try a new activity today!`;
  } else if (top.errorRate < 0.2) {
    reason = `Your recent performance in ${top.name} was strong.`;
  }

  return {
    gameId: top.gameId,
    reason
  };
}
