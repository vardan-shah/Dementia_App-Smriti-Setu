import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchRelatives, fetchStories } from '../../services/api';
import { db } from '../../db';
import { useTranslation } from 'react-i18next';

export function MemoryVault() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Local-first: Always read directly from Dexie for immediate rendering
  const relatives = useLiveQuery(
    () => id ? db.relatives.where('elderId').equals(id).toArray() : [],
    [id]
  ) || [];

  const stories = useLiveQuery(
    () => id ? db.memories.where('elderId').equals(id).toArray() : [],
    [id]
  ) || [];

  // Background Sync: Reconcile network changes safely without blocking UI
  useEffect(() => {
    if (!id || !navigator.onLine) return;
    
    let isMounted = true;
    
    async function syncDown() {
      try {
        const fetchedRelatives = await fetchRelatives(id!);
        if (!isMounted) return;
        
        // Reconcile relatives: Upsert new/updated records safely
        await db.transaction('rw', db.relatives, async () => {
          for (const fr of fetchedRelatives) {
            const existing = await db.relatives.get(fr.id);
            if (!existing || new Date(fr.updated_at) > new Date(existing.updatedAt)) {
              await db.relatives.put({
                id: fr.id,
                elderId: fr.elder_id,
                name: fr.name,
                relationship: fr.relationship,
                photoUrl: fr.photo_url,
                photoLocal: existing?.photoLocal,
                voiceUrl: fr.voice_url,
                voiceLocal: existing?.voiceLocal,
                createdAt: fr.created_at,
                updatedAt: fr.updated_at,
                syncStatus: 'SYNCED'
              });
            }
          }
        });

        const fetchedStories = await fetchStories(id!);
        if (!isMounted) return;

        await db.transaction('rw', db.memories, async () => {
          for (const fs of fetchedStories) {
            const existing = await db.memories.get(fs.id);
            if (!existing || new Date(fs.updated_at) > new Date(existing.updatedAt)) {
              await db.memories.put({
                id: fs.id,
                elderId: fs.elder_id,
                relativeId: fs.relative_id,
                title: fs.title,
                storyText: fs.description,
                photoUrl: fs.photo_url,
                photoLocal: existing?.photoLocal,
                voiceUrl: fs.voice_url,
                voiceLocal: existing?.voiceLocal,
                createdAt: fs.created_at,
                updatedAt: fs.updated_at,
                syncStatus: 'SYNCED'
              });
            }
          }
        });
      } catch (err) {
        console.warn('Background sync down failed:', err);
      }
    }
    
    syncDown();
    return () => { isMounted = false; };
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('memory_vault', 'Memory Vault')}</h1>
        <Button onClick={() => navigate(-1)} variant="outline">{t('back', 'Back')}</Button>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('relatives', 'Relatives')}</h2>
          <Button onClick={() => navigate(`/caregiver/elders/${id}/vault/relative/new`)}>+ {t('add_relative', 'Add Relative')}</Button>
        </div>
        
        {relatives.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <p className="text-gray-500 mb-4">{t('no_relatives_added', 'No relatives added yet.')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatives.map(relative => (
              <Card key={relative.id} className="overflow-hidden flex flex-col relative">
                {relative.syncStatus === 'PENDING' && (
                  <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Syncing...</span>
                )}
                {relative.photoLocal || relative.photoUrl ? (
                  <img src={relative.photoLocal || relative.photoUrl} alt={relative.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-4xl text-gray-400">
                    {relative.name.charAt(0)}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-xl">{relative.name}</h3>
                  <p className="text-gray-600 capitalize">{t(relative.relationship, relative.relationship)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('stories', 'Stories')}</h2>
          <Button onClick={() => navigate(`/caregiver/elders/${id}/vault/story/new`)}>+ {t('add_story', 'Add Story')}</Button>
        </div>
        {stories.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <p className="text-gray-500">{t('no_stories_added', 'No stories added yet.')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map(story => (
              <Card key={story.id} className="p-4 relative">
                {story.syncStatus === 'PENDING' && (
                  <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Syncing...</span>
                )}
                <h3 className="font-bold text-lg">{story.title}</h3>
                <p className="text-gray-600 line-clamp-2">{story.storyText}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
