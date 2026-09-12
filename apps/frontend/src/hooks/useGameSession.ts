import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { getRecommendedDifficulty } from '../services/adaptiveDifficulty';
import type { DifficultyLevel } from '../services/adaptiveDifficulty';

export interface GameMetrics {
  correct: number;
  errors: number;
  optionsPresented: number;
  totalReactionTimeMs: number;
}

export interface UseGameSessionResult<T = any> {
  difficulty: DifficultyLevel;
  loading: boolean;
  recordQuestionStart: () => void;
  recordAnswer: (isCorrect: boolean, optionsCount: number) => void;
  recordGameSpecificMetrics: (metrics: Partial<T>) => void;
  finishGame: (completed: boolean) => Promise<void>;
  setDifficulty: (diff: DifficultyLevel) => void;
}

export function useGameSession<T = any>(gameId: string, elderId: string | null): UseGameSessionResult<T> {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  
  const sessionStartTimeRef = useRef(Date.now());
  const questionStartTimeRef = useRef(Date.now());
  
  // Authoritative metric state held in refs to prevent finishGame race conditions
  const metricsRef = useRef<GameMetrics>({
    correct: 0,
    errors: 0,
    optionsPresented: 0,
    totalReactionTimeMs: 0
  });

  const specificMetricsRef = useRef<Partial<T>>({});

  useEffect(() => {
    async function init() {
      if (!elderId) return;
      try {
        const rec = await getRecommendedDifficulty(elderId, gameId);
        setDifficulty(rec);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [elderId, gameId]);

  const recordQuestionStart = useCallback(() => {
    questionStartTimeRef.current = Date.now();
  }, []);

  const recordAnswer = useCallback((isCorrect: boolean, optionsCount: number) => {
    const reactionTime = Date.now() - questionStartTimeRef.current;
    metricsRef.current.correct += isCorrect ? 1 : 0;
    metricsRef.current.errors += isCorrect ? 0 : 1;
    metricsRef.current.optionsPresented += optionsCount;
    metricsRef.current.totalReactionTimeMs += reactionTime;
  }, []);

  const recordGameSpecificMetrics = useCallback((payload: Partial<T>) => {
    specificMetricsRef.current = { ...specificMetricsRef.current, ...payload };
  }, []);

  const finishGame = useCallback(async (completed: boolean) => {
    if (!elderId) return;

    const sessionId = crypto.randomUUID();
    const completedAt = Date.now();
    
    const { correct, errors, totalReactionTimeMs, optionsPresented } = metricsRef.current;
    const totalAnswers = correct + errors;
    const errorRate = totalAnswers > 0 ? errors / totalAnswers : 0;
    const accuracy = totalAnswers > 0 ? correct / totalAnswers : 0;
    
    const finalMetrics = {
      correct,
      errors,
      optionsPresented,
      totalReactionTimeMs,
      avgReactionTimeMs: totalAnswers > 0 
        ? Math.round(totalReactionTimeMs / totalAnswers) 
        : 0,
      errorRate,
      accuracy,
      attempts: totalAnswers,
      timeOfDay: new Date().getHours(),
      gameSpecificMetrics: {
        difficulty,
        ...specificMetricsRef.current
      }
    };

    const session = {
      id: sessionId,
      gameId,
      elderId,
      status: completed ? ('COMPLETED' as const) : ('ABANDONED' as const),
      startedAt: new Date(sessionStartTimeRef.current).toISOString(),
      completedAt: new Date(completedAt).toISOString(),
      metrics: finalMetrics
    };
    
    // Create canonical performance record
    const { normalizePerformance } = await import('../services/personalization/normalization');
    const perfRecord = normalizePerformance(session);
    
    // Determine context for adaptive updates
    const { calculateContextKey, updateAdaptivePolicy } = await import('../services/personalization/adaptiveEngine');
    const recentRecords = await db.performanceRecords
      .where('elderId')
      .equals(elderId)
      .filter(r => r.gameId === gameId)
      .reverse()
      .limit(4) // 4 old + this new = 5 context window
      .toArray();
      
    const lastDifficulty = recentRecords.length > 0 ? (recentRecords[0].difficulty || 'MEDIUM') : 'MEDIUM';
    const contextKey = calculateContextKey(recentRecords, lastDifficulty);
    
    await db.transaction('rw', db.sessions, db.performanceRecords, db.syncEvents, db.adaptiveArmStates, db.adaptiveDecisions, async () => {
      await db.sessions.add(session as any);
      await db.performanceRecords.add(perfRecord);
      
      // Phase 6: Update Contextual Bandit Policy
      await updateAdaptivePolicy(perfRecord, contextKey);
      
      await db.syncEvents.add({
        id: crypto.randomUUID(),
        type: 'GAME_SESSION_COMPLETED',
        payload: { ...session, metrics: finalMetrics },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        retryCount: 0
      });
    });
    
    navigate('/elder/games');
  }, [elderId, gameId, difficulty, navigate]);

  return {
    difficulty,
    loading,
    recordQuestionStart,
    recordAnswer,
    recordGameSpecificMetrics,
    finishGame,
    setDifficulty
  };
}
