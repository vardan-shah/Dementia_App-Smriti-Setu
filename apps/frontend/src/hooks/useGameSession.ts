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

export interface UseGameSessionResult {
  difficulty: DifficultyLevel;
  metrics: GameMetrics;
  loading: boolean;
  recordQuestionStart: () => void;
  recordAnswer: (isCorrect: boolean, optionsCount: number) => void;
  finishGame: (completed: boolean) => Promise<void>;
  setDifficulty: (diff: DifficultyLevel) => void;
}

export function useGameSession(gameId: string, elderId: string | null): UseGameSessionResult {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  
  const sessionStartTimeRef = useRef(Date.now());
  const questionStartTimeRef = useRef(Date.now());
  
  const [metrics, setMetrics] = useState<GameMetrics>({ 
    correct: 0, 
    errors: 0, 
    optionsPresented: 0, 
    totalReactionTimeMs: 0 
  });

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
    
    setMetrics(m => ({
      ...m,
      correct: isCorrect ? m.correct + 1 : m.correct,
      errors: isCorrect ? m.errors : m.errors + 1,
      optionsPresented: m.optionsPresented + optionsCount,
      totalReactionTimeMs: m.totalReactionTimeMs + reactionTime
    }));
  }, []);

  const finishGame = useCallback(async (completed: boolean) => {
    if (!elderId) return;

    const sessionId = crypto.randomUUID();
    const completedAt = Date.now();
    
    const totalAnswers = metrics.correct + metrics.errors;
    const errorRate = totalAnswers > 0 ? metrics.errors / totalAnswers : 0;
    
    const finalMetrics = {
      ...metrics,
      avgReactionTimeMs: totalAnswers > 0 
        ? Math.round(metrics.totalReactionTimeMs / totalAnswers) 
        : 0,
      errorRate,
      timeOfDay: new Date().getHours(),
      gameSpecificMetrics: {
        difficulty
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
    
    await db.sessions.add(session as any);
    
    await db.syncEvents.add({
      id: crypto.randomUUID(),
      type: 'GAME_SESSION_COMPLETED',
      payload: { ...session, metrics: finalMetrics },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      retryCount: 0
    });
    
    navigate('/elder/games');
  }, [elderId, gameId, metrics, difficulty, navigate]);

  return {
    difficulty,
    metrics,
    loading,
    recordQuestionStart,
    recordAnswer,
    finishGame,
    setDifficulty // Exposing so games can batch state updates if needed
  };
}
