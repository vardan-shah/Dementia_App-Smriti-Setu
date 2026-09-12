import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../../../db';
import type { LocalRelative } from '../../../db';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDifficultyConfig } from '../../../services/adaptiveDifficulty';
import { useGameSession } from '../../../hooks/useGameSession';
import { GameShell } from '../../../components/elder/games/GameShell';

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
  
  const { 
    difficulty, 
    loading: sessionLoading, 
    recordQuestionStart, 
    recordAnswer, 
    finishGame, 
    setDifficulty 
  } = useGameSession('object-recognition', elderId);
  
  const [relatives, setRelatives] = useState<LocalRelative[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    async function loadContent() {
      if (!elderId) return;
      try {
        const stored = await db.relatives.where('elderId').equals(elderId).toArray();
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
    if (currentRelative && relatives.length > 0 && !sessionLoading) {
      recordQuestionStart();
      
      const config = getDifficultyConfig('object-recognition', difficulty);
      const numOptions = Math.min(config.choices, relatives.length);

      const correctAnswer = currentRelative.name;
      const pool = relatives.filter(r => r.id !== currentRelative.id).map(r => r.name);
      const distractors = shuffle(pool).slice(0, numOptions - 1);
      
      const combined = shuffle([correctAnswer, ...distractors]);
      setOptions(combined);
      
      setShowResult(false);
      setSelectedAnswer(null);
    }
  }, [currentRelative, relatives, difficulty, sessionLoading, recordQuestionStart]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === currentRelative.name;
    
    recordAnswer(isCorrect, options.length);

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

  const isFullLoading = loading || sessionLoading;
  const isEmpty = relatives.length === 0;

  if (!isFullLoading && !isEmpty && !currentRelative) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-4xl font-bold mb-6 text-green-600">{t('great_job', 'Great job!')}</h2>
        <Button onClick={() => finishGame(true)} className="text-xl py-4 px-8">{t('finish', 'Finish')}</Button>
      </div>
    );
  }

  return (
    <GameShell
      title={t('who_is_this', 'Who is this?')}
      loading={isFullLoading}
      emptyState={isEmpty}
      emptyStateMessage={t('ask_family_add_first', 'Ask a family member to add someone first.')}
      onExit={() => finishGame(false)}
    >
      {currentRelative && (
        <div className="flex flex-col items-center w-full">
          <div className="w-full aspect-square md:h-80 md:w-auto mb-8 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-gray-200 flex-shrink-0">
            <img 
              src={currentRelative.photoLocal || currentRelative.photoUrl} 
              alt="Relative" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            {options.map((opt) => {
              let btnClass = "text-2xl py-6 min-h-[64px] rounded-2xl border-2 transition-all ";
              
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
        </div>
      )}
    </GameShell>
  );
}
