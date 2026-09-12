import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../../../db';
import type { LocalRelative } from '../../../db';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ObjectRecognition() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const elderId = useAuthStore(s => s.elderId);
  const settings = useSettingsStore();
  
  const [relatives, setRelatives] = useState<LocalRelative[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Real Telemetry tracking
  const sessionStartTimeRef = useRef(Date.now());
  const questionStartTimeRef = useRef(Date.now());
  const [metrics, setMetrics] = useState({ 
    correct: 0, 
    errors: 0, 
    optionsPresented: 0, 
    totalReactionTimeMs: 0 
  });

  useEffect(() => {
    async function loadContent() {
      if (!elderId) return;
      try {
        const stored = await db.relatives.where('elderId').equals(elderId).toArray();
        // Use photoLocal or photoUrl
        const withPhotos = stored.filter(r => r.photoLocal || r.photoUrl);
        setRelatives(shuffle(withPhotos));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [elderId]);

  const currentRelative = relatives[currentIndex];

  useEffect(() => {
    if (currentRelative && relatives.length > 0) {
      questionStartTimeRef.current = Date.now();
      
      // Determine difficulty options (Easy=2, Medium=3, Hard=4)
      let numOptions = 3; 
      // If we had adaptiveDifficulty stored, we'd use it here. E.g.
      // if (settings.difficulty === 'EASY') numOptions = 2;
      // For now, let's just make it standard 3, or check if we can simulate adaptive
      numOptions = Math.min(3, relatives.length);

      const correctAnswer = currentRelative.name;
      const pool = relatives.filter(r => r.id !== currentRelative.id).map(r => r.name);
      const distractors = shuffle(pool).slice(0, numOptions - 1);
      
      const combined = shuffle([correctAnswer, ...distractors]);
      setOptions(combined);
      
      // Accumulate options presented for telemetry
      setMetrics(m => ({ ...m, optionsPresented: m.optionsPresented + combined.length }));
      setShowResult(false);
      setSelectedAnswer(null);
    }
  }, [currentRelative, relatives]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === currentRelative.name;
    const reactionTime = Date.now() - questionStartTimeRef.current;
    
    setMetrics(m => ({
      ...m,
      correct: isCorrect ? m.correct + 1 : m.correct,
      errors: isCorrect ? m.errors : m.errors + 1,
      totalReactionTimeMs: m.totalReactionTimeMs + reactionTime
    }));

    if (isCorrect) {
      setTimeout(() => {
        if (currentIndex < relatives.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          finishGame(true);
        }
      }, 2000);
    } else {
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
      }, 2500);
    }
  };

  const finishGame = async (completed: boolean) => {
    const sessionId = crypto.randomUUID();
    const completedAt = Date.now();
    
    const finalMetrics = {
      ...metrics,
      avgReactionTimeMs: metrics.correct + metrics.errors > 0 
        ? Math.round(metrics.totalReactionTimeMs / (metrics.correct + metrics.errors)) 
        : 0
    };

    const session = {
      id: sessionId,
      gameId: 'object-recognition',
      status: completed ? 'COMPLETED' : 'ABANDONED',
      startedAt: new Date(sessionStartTimeRef.current).toISOString(),
      completedAt: new Date(completedAt).toISOString(),
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
  };

  if (loading) return <div className="text-2xl text-center mt-20">{t('loading_game', 'Loading game...')}</div>;

  if (relatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{t('who_is_this', 'Who is this?')}</h2>
        <Card className="p-8 max-w-lg bg-orange-50 border-orange-200">
          <p className="text-2xl mb-4">{t('ask_family_add_first', 'Ask a family member to add someone first.')}</p>
          <Button onClick={() => navigate('/elder')} className="w-full text-xl py-4">{t('return_home', 'Return Home')}</Button>
        </Card>
      </div>
    );
  }

  if (!currentRelative) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-4xl font-bold mb-6 text-green-600">{t('great_job', 'Great job!')}</h2>
        <Button onClick={() => finishGame(true)} className="text-xl py-4 px-8">{t('finish', 'Finish')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 max-w-2xl mx-auto w-full">
      <h2 className="text-4xl font-bold mb-8 text-center">{t('who_is_this', 'Who is this?')}</h2>
      
      <div className="w-full aspect-square md:h-80 md:w-auto mb-8 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-gray-200 flex-shrink-0">
        <img 
          src={currentRelative.photoLocal || currentRelative.photoUrl} 
          alt="Relative" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 w-full">
        {options.map((opt) => {
          let btnClass = "text-2xl py-6 rounded-2xl border-2 transition-all ";
          
          if (showResult) {
            if (opt === currentRelative.name) {
              btnClass += "bg-green-100 border-green-500 text-green-800 scale-[1.02]";
            } else if (opt === selectedAnswer) {
              btnClass += "bg-red-100 border-red-500 text-red-800";
            } else {
              btnClass += "bg-white border-gray-200 opacity-50";
            }
          } else {
            btnClass += "bg-white border-primary text-primary hover:bg-gray-50 active:scale-95 shadow-sm";
          }

          return (
            <button 
              key={opt}
              className={btnClass}
              onClick={() => handleAnswer(opt)}
              disabled={showResult}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <Button variant="outline" onClick={() => finishGame(false)} className="text-lg">
          {t('exit_game', 'Exit Game')}
        </Button>
      </div>
    </div>
  );
}
