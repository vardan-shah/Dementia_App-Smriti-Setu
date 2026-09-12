import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../db';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDifficultyConfig } from '../../../services/adaptiveDifficulty';
import { useGameSession } from '../../../hooks/useGameSession';
import { useGameAudio } from '../../../hooks/useGameAudio';
import { GameShell } from '../../../components/elder/games/GameShell';

interface RecallItem {
  id: string;
  image: string;
  label: string;
}

const FALLBACK_ITEMS: RecallItem[] = [
  { id: 'fb1', image: '🍎', label: 'Apple' },
  { id: 'fb2', image: '🚲', label: 'Bicycle' },
  { id: 'fb3', image: '🐶', label: 'Dog' },
  { id: 'fb4', image: '🚗', label: 'Car' },
  { id: 'fb5', image: '🏠', label: 'House' },
  { id: 'fb6', image: '📖', label: 'Book' },
  { id: 'fb7', image: '☕', label: 'Tea cup' },
  { id: 'fb8', image: '🪑', label: 'Chair' },
  { id: 'fb9', image: '🌺', label: 'Flower' },
  { id: 'fb10', image: '🐱', label: 'Cat' }
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface RecallMetrics {
  studyItemCount: number;
  candidateCount: number;
  correctlyRecalled: number;
  incorrectlySelected: number;
  omittedItems: number;
  totalSelectionTimeMs: number;
}

export function Recall() {
  const { t } = useTranslation();
  const elderId = useAuthStore(s => s.elderId);

  const {
    difficulty,
    loading: sessionLoading,
    recordQuestionStart,
    recordAnswer,
    recordGameSpecificMetrics,
    finishGame
  } = useGameSession<RecallMetrics>('recall', elderId);

  const { speak, isAvailable } = useGameAudio();

  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'STUDY' | 'RECALL' | 'RESULT'>('STUDY');
  
  const [studyItems, setStudyItems] = useState<RecallItem[]>([]);
  const [candidateItems, setCandidateItems] = useState<RecallItem[]>([]);
  const [rawPool, setRawPool] = useState<RecallItem[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(10);
  const [initialTime, setInitialTime] = useState(10);
  const [scoreResult, setScoreResult] = useState<{ correct: number, total: number } | null>(null);

  const selectionStartTimeRef = useRef(Date.now());
  const hasInitializedGame = useRef(false);

  // 1. Single Data Fetch
  useEffect(() => {
    async function fetchPool() {
      if (!elderId) return;
      try {
        const [rels, mems] = await Promise.all([
          db.relatives.where('elderId').equals(elderId).toArray(),
          db.memories.where('elderId').equals(elderId).toArray()
        ]);

        const customItems: RecallItem[] = [
          ...rels.filter(r => r.photoLocal || r.photoUrl).map(r => ({ id: r.id, image: (r.photoLocal || r.photoUrl) as string, label: r.name })),
          ...mems.filter(m => m.photoLocal || m.photoUrl).map(m => ({ id: m.id, image: (m.photoLocal || m.photoUrl) as string, label: m.title }))
        ];

        let pool = shuffle([...customItems, ...FALLBACK_ITEMS]);
        pool = Array.from(new Map(pool.map(item => [item.id, item])).values());
        setRawPool(pool);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPool();
  }, [elderId]);

  const handleStartRecall = useCallback(() => {
    setPhase('RECALL');
    selectionStartTimeRef.current = Date.now();
    recordQuestionStart();
    if (isAvailable) {
      speak(t('recall_instruction_pick', 'Which items did you see?'));
    }
  }, [recordQuestionStart, isAvailable, speak, t]);

  // 2. Setup game items and timer based on difficulty
  useEffect(() => {
    if (rawPool.length > 0 && !sessionLoading && !hasInitializedGame.current) {
      hasInitializedGame.current = true;
      const config = getDifficultyConfig('recall', difficulty);
      const studySize = Math.min(config.studyItems, rawPool.length);
      const candidateSize = Math.min(config.candidateSetSize, rawPool.length);

      const chosenCandidates = rawPool.slice(0, candidateSize);
      const chosenStudy = shuffle(chosenCandidates).slice(0, studySize);

      setStudyItems(chosenStudy);
      setCandidateItems(shuffle(chosenCandidates));
      
      const durationSeconds = Math.round(config.studyDurationMs / 1000);
      setTimeLeft(durationSeconds);
      setInitialTime(durationSeconds);

      if (durationSeconds <= 0) {
        handleStartRecall();
      } else if (isAvailable) {
        speak(t('recall_instruction_study', 'Look carefully at these items:'));
      }
    }
  }, [rawPool, difficulty, sessionLoading, isAvailable, speak, t, handleStartRecall]);

  // 3. Study Phase Timer
  useEffect(() => {
    if (phase !== 'STUDY' || studyItems.length === 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleStartRecall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, studyItems, handleStartRecall]);

  const toggleSelection = (id: string) => {
    if (phase !== 'RECALL') return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSubmit = () => {
    setPhase('RESULT');
    const totalSelectionTimeMs = Date.now() - selectionStartTimeRef.current;
    
    // Evaluate correctness quantitatively
    const studySet = new Set(studyItems.map(i => i.id));
    
    let correctlyRecalled = 0;
    let incorrectlySelected = 0;
    let omittedItems = 0;
    
    for (const id of studySet) {
      if (selectedIds.has(id)) {
        correctlyRecalled++;
      } else {
        omittedItems++;
      }
    }
    
    for (const id of selectedIds) {
      if (!studySet.has(id)) {
        incorrectlySelected++;
      }
    }
    
    // An answer is perfectly correct only if they got all and no distractors
    const isPerfect = correctlyRecalled === studyItems.length && incorrectlySelected === 0;
    
    recordAnswer(isPerfect, candidateItems.length);
    
    recordGameSpecificMetrics({
      studyItemCount: studyItems.length,
      candidateCount: candidateItems.length,
      correctlyRecalled,
      incorrectlySelected,
      omittedItems,
      totalSelectionTimeMs
    });

    setScoreResult({ correct: correctlyRecalled, total: studyItems.length });
    
    if (isAvailable) {
      const feedbackStr = isPerfect ? t('great_job', 'Great job!') : `${correctlyRecalled} out of ${studyItems.length}`;
      speak(feedbackStr);
    }
  };

  const isFullLoading = loading || sessionLoading;

  return (
    <GameShell
      loading={isFullLoading}
      emptyState={rawPool.length === 0}
      onExit={() => finishGame(false)}
      title={t('recall_game_title', 'Memory Recall')}
      instruction={phase === 'STUDY' ? t('recall_instruction_study', 'Look carefully at these items:') : phase === 'RECALL' ? t('recall_instruction_pick', 'Which items did you see?') : null}
      audioControl={
        isAvailable ? (
          <Button 
            variant="ghost" 
            className="rounded-full w-12 h-12 flex items-center justify-center bg-gray-100"
            onClick={() => speak(phase === 'STUDY' ? t('recall_instruction_study', 'Look carefully at these items:') : t('recall_instruction_pick', 'Which items did you see?'))}
            aria-label="Play Instruction"
          >
            🔊
          </Button>
        ) : null
      }
      progress={
        phase === 'STUDY' ? (
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / initialTime) * 100}%` }}
            />
          </div>
        ) : null
      }
    >
      {phase === 'STUDY' && studyItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 w-full max-w-xl">
          {studyItems.map(item => (
            <div key={item.id} className="aspect-square rounded-2xl overflow-hidden shadow-md border-4 border-white bg-gray-100 flex items-center justify-center text-8xl">
              {item.image.startsWith('http') || item.image.startsWith('data:') ? (
                <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
              ) : (
                <span>{item.image}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === 'RECALL' && (
        <div className="flex flex-col items-center w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 w-full max-w-2xl">
            {candidateItems.map(item => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={`relative aspect-square rounded-2xl overflow-hidden shadow-md border-4 transition-all flex items-center justify-center text-6xl md:text-8xl min-h-[64px] min-w-[64px] ${
                    isSelected ? 'border-primary ring-4 ring-primary scale-105' : 'border-white bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {item.image.startsWith('http') || item.image.startsWith('data:') ? (
                    <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                  ) : (
                    <span>{item.image}</span>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button onClick={handleSubmit} disabled={selectedIds.size === 0} className="text-2xl py-4 px-12 min-h-[64px]">
            {t('submit', "Submit")}
          </Button>
        </div>
      )}

      {phase === 'RESULT' && scoreResult && (
        <div className="flex flex-col items-center w-full text-center p-8 bg-green-50 rounded-2xl border-2 border-green-200">
          <h2 className="text-4xl font-bold mb-4 text-green-700">
            {scoreResult.correct === scoreResult.total ? t('great_job', 'Great job!') : 'Well done!'}
          </h2>
          <p className="text-2xl mb-8">
            You remembered {scoreResult.correct} out of {scoreResult.total}.
          </p>
          <Button onClick={() => finishGame(true)} className="text-2xl py-4 px-12 min-h-[64px]">
            {t('finish', 'Finish')}
          </Button>
        </div>
      )}
    </GameShell>
  );
}
