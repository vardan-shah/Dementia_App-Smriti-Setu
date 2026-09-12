import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../db';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDifficultyConfig } from '../../../services/adaptiveDifficulty';
import { useGameSession } from '../../../hooks/useGameSession';
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

export function Recall() {
  const { t } = useTranslation();
  const elderId = useAuthStore(s => s.elderId);

  const {
    difficulty,
    loading: sessionLoading,
    recordQuestionStart,
    recordAnswer,
    finishGame,
    setDifficulty
  } = useGameSession('recall', elderId);

  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'STUDY' | 'RECALL' | 'RESULT'>('STUDY');
  
  const [studyItems, setStudyItems] = useState<RecallItem[]>([]);
  const [candidateItems, setCandidateItems] = useState<RecallItem[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadContent() {
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

        // Ensure unique custom items by id (in case memory shares relative id, wait memories have their own id)
        const uniqueCustom = Array.from(new Map(customItems.map(item => [item.id, item])).values());
        
        let pool = shuffle([...uniqueCustom, ...FALLBACK_ITEMS]);
        // De-duplicate if fallbacks somehow overlap id (they won't)
        pool = Array.from(new Map(pool.map(item => [item.id, item])).values());

        // Wait for session config
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [elderId]);

  // Secondary effect to pick items based on difficulty once difficulty resolves
  // We need to store the raw pool first.
  const [rawPool, setRawPool] = useState<RecallItem[]>([]);

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

  useEffect(() => {
    if (rawPool.length > 0 && !sessionLoading) {
      const config = getDifficultyConfig('recall', difficulty);
      const studySize = Math.min(config.studyItems, rawPool.length);
      const candidateSize = Math.min(config.candidateSetSize, rawPool.length);

      const chosenCandidates = rawPool.slice(0, candidateSize);
      const chosenStudy = shuffle(chosenCandidates).slice(0, studySize);

      setStudyItems(chosenStudy);
      setCandidateItems(shuffle(chosenCandidates));
    }
  }, [rawPool, difficulty, sessionLoading]);

  const handleStartRecall = () => {
    setPhase('RECALL');
    recordQuestionStart();
  };

  const toggleSelection = (id: string) => {
    if (phase !== 'RECALL') return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSubmit = () => {
    setPhase('RESULT');
    
    // Evaluate correctness
    const studySet = new Set(studyItems.map(i => i.id));
    
    // A perfect score means they selected exactly all study items and no distractors
    let isCorrect = true;
    
    // Did they select all study items?
    for (const id of studySet) {
      if (!selectedIds.has(id)) {
        isCorrect = false;
        break;
      }
    }
    
    // Did they select any distractors?
    if (isCorrect) {
      for (const id of selectedIds) {
        if (!studySet.has(id)) {
          isCorrect = false;
          break;
        }
      }
    }

    recordAnswer(isCorrect, candidateItems.length);
  };

  const isFullLoading = loading || sessionLoading;

  return (
    <GameShell
      title={t('recall_game_title', 'Memory Recall')}
      loading={isFullLoading}
      emptyState={rawPool.length === 0}
      onExit={() => finishGame(false)}
    >
      {phase === 'STUDY' && studyItems.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <p className="text-2xl mb-8">{t('recall_instruction_study', 'Look carefully at these items:')}</p>
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
          <Button onClick={handleStartRecall} className="text-2xl py-4 px-12">
            {t('im_ready', "I'm ready")}
          </Button>
        </div>
      )}

      {phase === 'RECALL' && (
        <div className="flex flex-col items-center w-full">
          <p className="text-2xl mb-8">{t('recall_instruction_pick', 'Which items did you see?')}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 w-full max-w-2xl">
            {candidateItems.map(item => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={`relative aspect-square rounded-2xl overflow-hidden shadow-md border-4 transition-all flex items-center justify-center text-6xl md:text-8xl ${
                    isSelected ? 'border-primary ring-4 ring-primary scale-105' : 'border-white bg-gray-100'
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
          <Button onClick={handleSubmit} disabled={selectedIds.size === 0} className="text-2xl py-4 px-12">
            {t('submit', "Submit")}
          </Button>
        </div>
      )}

      {phase === 'RESULT' && (
        <div className="flex flex-col items-center w-full text-center">
          <h2 className="text-4xl font-bold mb-6 text-green-600">{t('great_job', 'Great job!')}</h2>
          <Button onClick={() => finishGame(true)} className="text-xl py-4 px-8 mt-6">
            {t('finish', 'Finish')}
          </Button>
        </div>
      )}
    </GameShell>
  );
}
