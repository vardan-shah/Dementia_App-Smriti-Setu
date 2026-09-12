import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { getDifficultyConfig } from '../../../services/adaptiveDifficulty';
import { useGameSession } from '../../../hooks/useGameSession';
import { useGameAudio } from '../../../hooks/useGameAudio';
import { GameShell } from '../../../components/elder/games/GameShell';
import { VOCABULARY } from '../../../data/vocabulary';
import type { LocalizedVocabulary } from '../../../data/vocabulary';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface LanguageMetrics {
  vocabularyItemId: string;
  selectedLocale: string;
}

export function LanguageExercises() {
  const { t } = useTranslation();
  const elderId = useAuthStore(s => s.elderId);
  const settings = useSettingsStore();

  const language = settings.language as 'en' | 'hi' | 'as' | 'bn';

  const {
    difficulty,
    loading: sessionLoading,
    recordQuestionStart,
    recordAnswer,
    recordGameSpecificMetrics,
    finishGame
  } = useGameSession<LanguageMetrics>('language-exercises', elderId);

  const { speak, isAvailable } = useGameAudio();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pool, setPool] = useState<LocalizedVocabulary[]>([]);

  useEffect(() => {
    setPool(shuffle([...VOCABULARY]));
  }, []);

  const currentItem = pool[currentIndex];

  useEffect(() => {
    if (currentItem && !sessionLoading) {
      recordQuestionStart();
      
      const config = getDifficultyConfig('language-exercises', difficulty);
      const numOptions = Math.min(config.choices, pool.length);

      const correctAnswer = currentItem.translations[language] || currentItem.translations.en;
      
      const distractorsPool = pool.filter(v => v.id !== currentItem.id);
      const distractors = shuffle(distractorsPool)
        .slice(0, numOptions - 1)
        .map(v => v.translations[language] || v.translations.en);
      
      const combined = shuffle([correctAnswer, ...distractors]);
      setOptions(combined);
      
      setShowResult(false);
      setSelectedAnswer(null);

      if (isAvailable) {
        speak(t('language_instruction_pick', 'Which word matches the picture?'), language);
      }
    }
  }, [currentItem, language, difficulty, sessionLoading, pool, recordQuestionStart, isAvailable, speak, t]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const correctAnswer = currentItem.translations[language] || currentItem.translations.en;
    const isCorrect = answer === correctAnswer;
    
    recordAnswer(isCorrect, options.length);
    recordGameSpecificMetrics({
      vocabularyItemId: currentItem.id,
      selectedLocale: language
    });

    if (isAvailable && isCorrect) {
       speak(correctAnswer, language);
    }

    if (isCorrect) {
      setTimeout(() => {
        if (currentIndex < pool.length - 1 && currentIndex < 9) {
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

  const isFullLoading = sessionLoading || pool.length === 0;

  if (!isFullLoading && !currentItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-4xl font-bold mb-6 text-green-600">{t('great_job', 'Great job!')}</h2>
        <Button onClick={() => finishGame(true)} className="text-xl py-4 px-8">{t('finish', 'Finish')}</Button>
      </div>
    );
  }

  return (
    <GameShell
      title={t('language_game_title', 'Match the Word')}
      instruction={t('language_instruction_pick', 'Which word matches the picture?')}
      loading={isFullLoading}
      emptyState={false}
      onExit={() => finishGame(false)}
      audioControl={
        isAvailable ? (
          <Button 
            variant="ghost" 
            className="rounded-full w-12 h-12 flex items-center justify-center bg-gray-100"
            onClick={() => speak(t('language_instruction_pick', 'Which word matches the picture?'), language)}
            aria-label="Play Instruction"
          >
            🔊
          </Button>
        ) : null
      }
    >
      {currentItem && (
        <div className="flex flex-col items-center w-full">
          <div className="w-full aspect-square md:h-80 md:w-auto mb-8 rounded-2xl overflow-hidden shadow-md border-4 border-white bg-gray-100 flex items-center justify-center text-8xl md:text-9xl flex-shrink-0">
            <span>{currentItem.image}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            {options.map((opt) => {
              let btnClass = "text-2xl py-6 min-h-[64px] rounded-2xl border-2 transition-all ";
              const correctAnswer = currentItem.translations[language] || currentItem.translations.en;
              
              if (showResult) {
                if (opt === correctAnswer) {
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
